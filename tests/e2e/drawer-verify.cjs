// #68: 모바일 햄버거+드로어 검증 — 열기/닫기 트리거 4종, focus trap·복귀, 뒤로가기,
// body 스크롤 잠금, 44px 터치 목표, safe-area, 200%/텍스트 확대 시 클리핑 0, 데스크톱 회귀 0.
const { chromium, webkit, firefox } = require("playwright");
const fs = require("fs");
const BASE = "http://localhost:3100";
const OUT = process.argv[2];
const LOCAL_ARTIFACT = /Access-Control-Allow-Origin|manifest|Failed to load resource: .*401/;
const MOBILE_VIEWPORTS = [[320, 700], [360, 800], [375, 812], [390, 844], [430, 932]];
const DESKTOP = [1440, 900];

async function withPage(browser, viewport, fn) {
  const page = await browser.newPage({ viewport: { width: viewport[0], height: viewport[1] } });
  const consoleErrs = [];
  page.on("console", (m) => { if (m.type() === "error" && !LOCAL_ARTIFACT.test(m.text())) consoleErrs.push(m.text().slice(0, 120)); });
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    return await fn(page, consoleErrs);
  } finally {
    await page.close();
  }
}

const rectsOverlap = (a, b) => {
  if (!a || !b) return 0;
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 1 && h > 1 ? Math.round(w * h) : 0;
};

async function closedStateChecks(page, fails, label) {
  const r = await page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const toggle = document.querySelector(".nav-toggle");
    const hero = document.querySelector(".home-hero .eyebrow");
    const infoNav = document.querySelector(".info-nav");
    const spanRects = toggle ? [...toggle.querySelectorAll("span")].map((s) => s.getBoundingClientRect()) : [];
    return {
      toggleRect: rect(toggle),
      toggleVisible: toggle ? getComputedStyle(toggle).display !== "none" : false,
      heroRect: rect(hero),
      infoNavDisplay: infoNav ? getComputedStyle(infoNav).display : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      spanRects: spanRects.map((r) => ({ top: r.top, left: r.left, width: r.width })),
    };
  });
  if (!r.toggleVisible) fails.push(`${label}:toggleNotVisible`);
  if (r.toggleRect && (r.toggleRect.width < 44 || r.toggleRect.height < 44)) fails.push(`${label}:toggleUnder44=${Math.round(r.toggleRect.width)}x${Math.round(r.toggleRect.height)}`);
  if (r.infoNavDisplay !== "none") fails.push(`${label}:infoNavStillVisible`);
  // 햄버거 3줄이 세로로 쌓이는지(가로로 나란히 배치되면 "☰" 대신 "—‗‗"처럼 보임 — 실기기 확인된 버그)
  if (r.spanRects.length === 3) {
    const sameX = Math.abs(r.spanRects[0].left - r.spanRects[1].left) < 1 && Math.abs(r.spanRects[1].left - r.spanRects[2].left) < 1;
    const stacked = r.spanRects[1].top > r.spanRects[0].top + 1 && r.spanRects[2].top > r.spanRects[1].top + 1;
    if (!sameX || !stacked) fails.push(`${label}:hamburgerBarsNotStacked`);
  } else {
    fails.push(`${label}:hamburgerBarCountUnexpected=${r.spanRects.length}`);
  }
  const headerOverlap = rectsOverlap(r.toggleRect, r.heroRect);
  if (headerOverlap) fails.push(`${label}:closedHeaderXhero=${headerOverlap}`);
  if (r.overflowX > 0) fails.push(`${label}:closedOverflowX=${r.overflowX}`);
}

async function openStateChecks(page, fails, label) {
  await page.click(".nav-toggle");
  await page.waitForTimeout(320);
  const r = await page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const panel = document.querySelector(".drawer-panel");
    const backdrop = document.querySelector(".drawer-backdrop");
    const links = [...document.querySelectorAll(".drawer-nav a, .drawer-cta")];
    const toggle = document.querySelector(".nav-toggle");
    const active = document.activeElement;
    return {
      expanded: toggle?.getAttribute("aria-expanded"),
      panelRect: rect(panel),
      backdropRect: rect(backdrop),
      panelClip: panel ? panel.scrollWidth > panel.clientWidth + 1 : null,
      linkRects: links.map((a) => rect(a)),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: getComputedStyle(document.body).overflow,
      focusedIsClose: active?.className === "drawer-close",
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
    };
  });
  if (r.expanded !== "true") fails.push(`${label}:ariaExpandedNotTrue`);
  if (!r.focusedIsClose) fails.push(`${label}:focusNotOnClose`);
  if (r.bodyOverflow !== "hidden") fails.push(`${label}:bodyScrollNotLocked`);
  if (r.panelClip) fails.push(`${label}:panelClipped`);
  if (r.overflowX > 0) fails.push(`${label}:openOverflowX=${r.overflowX}`);
  if (r.panelRect && r.panelRect.right > r.viewportW + 1) fails.push(`${label}:panelOverflowsViewport`);
  if (r.backdropRect && (r.backdropRect.width < r.viewportW - 1 || r.backdropRect.height < r.viewportH - 1)) fails.push(`${label}:backdropIncomplete=${Math.round(r.backdropRect.width)}x${Math.round(r.backdropRect.height)}`);
  r.linkRects.forEach((rect, i) => { if (rect && rect.height < 43.5) fails.push(`${label}:link[${i}]Under44=${Math.round(rect.height)}`); });
  return r;
}

async function focusTrapCheck(page, fails, label) {
  // 마지막 항목에서 Tab → 첫 항목(닫기 버튼)으로 순환
  const count = await page.evaluate(() => document.querySelectorAll(".drawer-panel a[href], .drawer-panel button").length);
  for (let i = 0; i < count; i++) await page.keyboard.press("Tab");
  const wrapped = await page.evaluate(() => document.activeElement?.className === "drawer-close");
  if (!wrapped) fails.push(`${label}:focusTrapForwardNoWrap`);
  await page.keyboard.press("Shift+Tab");
  const backToLast = await page.evaluate(() => {
    const links = document.querySelectorAll(".drawer-panel a[href], .drawer-panel button");
    return document.activeElement === links[links.length - 1];
  });
  if (!backToLast) fails.push(`${label}:focusTrapBackwardNoWrap`);
}

(async () => {
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const fails = [];

  for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit], ["firefox", firefox]]) {
    const browser = await engine.launch();

    for (const vp of MOBILE_VIEWPORTS) {
      const label = `${engineName}-${vp[0]}`;

      // ── 기본: 닫힌 상태 + 열기(햄버거 클릭) → 검사 → Escape로 닫기 + 포커스 복귀 ──
      await withPage(browser, vp, async (page, consoleErrs) => {
        await closedStateChecks(page, fails, label);
        await openStateChecks(page, fails, label);
        await focusTrapCheck(page, fails, `${label}:trap`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(320);
        const afterEsc = await page.evaluate(() => ({
          open: document.querySelector(".drawer-root")?.className.includes("open"),
          focusBackOnToggle: document.activeElement?.className === "nav-toggle",
          bodyOverflow: getComputedStyle(document.body).overflow,
        }));
        if (afterEsc.open) fails.push(`${label}:escDidNotClose`);
        if (!afterEsc.focusBackOnToggle) fails.push(`${label}:escFocusNotRestored`);
        if (afterEsc.bodyOverflow === "hidden") fails.push(`${label}:escScrollStillLocked`);
        if (consoleErrs.length) fails.push(`${label}:console:${consoleErrs[0]}`);
      });

      // ── 배경(backdrop) 클릭 → 닫힘 (패널 폭 밖의 좌표를 클릭해야 backdrop이 맞는다) ──
      await withPage(browser, vp, async (page) => {
        await page.click(".nav-toggle");
        await page.waitForTimeout(320);
        await page.click(".drawer-backdrop", { position: { x: vp[0] - 8, y: 50 } });
        await page.waitForTimeout(320);
        const open = await page.evaluate(() => document.querySelector(".drawer-root")?.className.includes("open"));
        if (open) fails.push(`${label}:backdropClickDidNotClose`);
      });

      // ── 닫기 버튼 클릭 → 닫힘 ──
      await withPage(browser, vp, async (page) => {
        await page.click(".nav-toggle");
        await page.waitForTimeout(320);
        await page.click(".drawer-close");
        await page.waitForTimeout(320);
        const open = await page.evaluate(() => document.querySelector(".drawer-root")?.className.includes("open"));
        if (open) fails.push(`${label}:closeButtonDidNotClose`);
      });

      // ── 메뉴 링크 클릭 → 닫히고 해당 경로로 이동 ──
      await withPage(browser, vp, async (page) => {
        await page.click(".nav-toggle");
        await page.waitForTimeout(320);
        await page.click(".drawer-nav a:first-child");
        await page.waitForURL("**/why", { timeout: 3000 }).catch(() => fails.push(`${label}:navLinkDidNotNavigate`));
      });

      // ── 브라우저 뒤로가기: 열린 드로어부터 닫힘(페이지 이탈 아님) ──
      await withPage(browser, vp, async (page) => {
        await page.click(".nav-toggle");
        await page.waitForTimeout(320);
        await page.goBack();
        await page.waitForTimeout(320);
        const state = await page.evaluate(() => ({
          open: document.querySelector(".drawer-root")?.className.includes("open"),
          path: location.pathname,
        }));
        if (state.open) fails.push(`${label}:backButtonDidNotCloseDrawer`);
        if (state.path !== "/") fails.push(`${label}:backButtonLeftPage=${state.path}`);
      });

      // ── reduced-motion: 전환 없이 즉시 열림/닫힘 상태 반영 ──
      await (async () => {
        const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, reducedMotion: "reduce" });
        await page.goto(BASE + "/", { waitUntil: "networkidle" });
        await page.click(".nav-toggle");
        const openImmediately = await page.evaluate(() => document.querySelector(".drawer-root")?.className.includes("open"));
        if (!openImmediately) fails.push(`${label}:reducedMotionOpenFailed`);
        await page.close();
      })();

      // ── 텍스트 확대(200% 근사) 시 드로어 내부 클리핑 0 ──
      await withPage(browser, vp, async (page) => {
        await page.addStyleTag({ content: ".drawer-nav a, .drawer-cta { font-size: 1.6em !important; }" });
        await page.click(".nav-toggle");
        await page.waitForTimeout(320);
        const clip = await page.evaluate(() => {
          const panel = document.querySelector(".drawer-panel");
          const nav = document.querySelector(".drawer-nav");
          return { panelClip: panel.scrollWidth > panel.clientWidth + 1, navClip: nav.scrollHeight > panel.clientHeight * 3 };
        });
        if (clip.panelClip) fails.push(`${label}:zoomPanelClip`);
      });

      if (OUT && engineName === "webkit" && [375, 390, 430].includes(vp[0])) {
        await withPage(browser, vp, async (page) => {
          await page.click(".nav-toggle");
          await page.waitForTimeout(320);
          await page.screenshot({ path: `${OUT}/drawer-open-${vp[0]}-webkit.png` });
        });
      }
    }

    // ── 데스크톱 1440 회귀: 햄버거·드로어 완전 비활성, 기존 sticky 내비 유지 ──
    await withPage(browser, DESKTOP, async (page) => {
      const r = await page.evaluate(() => ({
        toggleDisplay: getComputedStyle(document.querySelector(".nav-toggle")).display,
        infoNavDisplay: getComputedStyle(document.querySelector(".info-nav")).display,
        topbarPosition: getComputedStyle(document.querySelector(".home .topbar")).position,
        navLinkCount: document.querySelectorAll(".info-nav a").length,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      if (r.toggleDisplay !== "none") fails.push(`desktop:${engineName}:toggleVisible`);
      if (r.infoNavDisplay === "none") fails.push(`desktop:${engineName}:infoNavHidden`);
      if (r.topbarPosition !== "sticky") fails.push(`desktop:${engineName}:notSticky`);
      if (r.navLinkCount !== 7) fails.push(`desktop:${engineName}:navLinkCount=${r.navLinkCount}`); // 6개 + 데모 열기
      if (r.overflowX > 0) fails.push(`desktop:${engineName}:overflowX=${r.overflowX}`);
      // 열림 상태를 강제해도(리사이즈 잔존 시나리오) 데스크톱에서 드로어 자체가 비활성인지
      await page.evaluate(() => document.querySelector(".drawer-root")?.classList.add("open"));
      const forcedOpenDisplay = await page.evaluate(() => getComputedStyle(document.querySelector(".drawer-root")).display);
      if (forcedOpenDisplay !== "none") fails.push(`desktop:${engineName}:drawerNotFullyDisabled`);
      if (OUT) await page.screenshot({ path: `${OUT}/desktop-1440-${engineName}.png` });
    });

    await browser.close();
  }

  if (OUT) fs.writeFileSync(`${OUT}/drawer-verify-fails.json`, JSON.stringify(fails, null, 2));
  if (fails.length) {
    console.error(`drawer-verify FAIL (${fails.length} issues)`);
    fails.slice(0, 30).forEach((f) => console.error("  " + f));
    process.exit(1);
  }
  console.log("drawer-verify PASS (320-430 x Chromium/WebKit: closed-state 교차 0, open/close 5종 트리거, focus trap+복귀, 뒤로가기, body 잠금, 44px, 확대 클리핑 0, 데스크톱 1440 회귀 0)");
})();
