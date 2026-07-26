// #69: 데모 헤더 모바일 액션 메뉴("⋯" + 우상단 팝오버) 검증 — 열기/닫기 트리거,
// focus trap·복귀, 뒤로가기, body 스크롤 잠금, 44px, 텍스트 클리핑 0, 데스크톱 회귀 0.
const { chromium, webkit, firefox } = require("playwright");
const fs = require("fs");
const BASE = "http://localhost:3100";
const OUT = process.argv[2];
const LOCAL_ARTIFACT = /Access-Control-Allow-Origin|manifest|Failed to load resource: .*401/;
const MOBILE_VIEWPORTS = [[360, 800], [375, 812], [390, 844], [430, 932]];
const DESKTOP = [1440, 900];

async function enterJourney(page) {
  await page.goto(BASE + "/demo?sample=1", { waitUntil: "networkidle" });
  await page.locator(".check-row input").first().check();
  await page.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();
  await page.waitForSelector(".actions-toggle", { timeout: 8000, state: "attached" }); // 데스크톱에선 의도적으로 display:none
}

async function withJourneyPage(browser, viewport, fn) {
  const page = await browser.newPage({ viewport: { width: viewport[0], height: viewport[1] } });
  const consoleErrs = [];
  page.on("console", (m) => { if (m.type() === "error" && !LOCAL_ARTIFACT.test(m.text())) consoleErrs.push(m.text().slice(0, 120)); });
  try {
    await enterJourney(page);
    return await fn(page, consoleErrs);
  } finally {
    await page.close();
  }
}

const clip = (el) => el && el.scrollWidth > el.clientWidth + 1;

async function closedStateChecks(page, fails, label) {
  const r = await page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const toggle = document.querySelector(".actions-toggle");
    const topActions = document.querySelector(".top-actions");
    return {
      toggleRect: rect(toggle),
      toggleVisible: toggle ? getComputedStyle(toggle).display !== "none" : false,
      topActionsDisplay: topActions ? getComputedStyle(topActions).display : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (!r.toggleVisible) fails.push(`${label}:toggleNotVisible`);
  if (r.toggleRect && (r.toggleRect.width < 44 || r.toggleRect.height < 44)) fails.push(`${label}:toggleUnder44`);
  if (r.topActionsDisplay !== "none") fails.push(`${label}:topActionsStillVisible`);
  if (r.overflowX > 0) fails.push(`${label}:closedOverflowX=${r.overflowX}`);
}

async function openStateChecks(page, fails, label) {
  await page.click(".actions-toggle");
  await page.waitForTimeout(280);
  const r = await page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const panel = document.querySelector(".actions-panel");
    const modelLine = document.querySelector(".actions-model-row b");
    const badgeText = document.querySelector(".actions-panel .sample-badge-text");
    const toggle = document.querySelector(".actions-toggle");
    const active = document.activeElement;
    return {
      expanded: toggle?.getAttribute("aria-expanded"),
      panelRect: rect(panel),
      panelClip: panel ? panel.scrollWidth > panel.clientWidth + 1 : null,
      modelLineClip: modelLine ? modelLine.scrollWidth > modelLine.clientWidth + 1 : null,
      badgeTextClip: badgeText ? badgeText.scrollWidth > badgeText.clientWidth + 1 : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: getComputedStyle(document.body).overflow,
      focusedIsClose: active?.className === "drawer-close",
      viewportW: window.innerWidth,
    };
  });
  if (r.expanded !== "true") fails.push(`${label}:ariaExpandedNotTrue`);
  if (!r.focusedIsClose) fails.push(`${label}:focusNotOnClose`);
  if (r.bodyOverflow !== "hidden") fails.push(`${label}:bodyScrollNotLocked`);
  if (r.panelClip) fails.push(`${label}:panelClipped`);
  if (r.modelLineClip) fails.push(`${label}:modelLineClipped(word-wrap-bug)`);
  if (r.badgeTextClip) fails.push(`${label}:badgeTextClipped`);
  if (r.overflowX > 0) fails.push(`${label}:openOverflowX=${r.overflowX}`);
  if (r.panelRect && r.panelRect.right > r.viewportW + 1) fails.push(`${label}:panelOverflowsViewport`);
  if (r.panelRect && r.panelRect.left < -1) fails.push(`${label}:panelOverflowsLeft`);
}

(async () => {
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const fails = [];

  for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit], ["firefox", firefox]]) {
    const browser = await engine.launch();

    for (const vp of MOBILE_VIEWPORTS) {
      const label = `${engineName}-${vp[0]}`;

      await withJourneyPage(browser, vp, async (page, consoleErrs) => {
        await closedStateChecks(page, fails, label);
        await openStateChecks(page, fails, label);
        // focus trap: 마지막(닫기 버튼만 있는 경우 모델변경까지) → Tab 순환
        const count = await page.evaluate(() => document.querySelectorAll(".actions-panel a[href], .actions-panel button").length);
        for (let i = 0; i < count; i++) await page.keyboard.press("Tab");
        const wrapped = await page.evaluate(() => document.activeElement?.className === "drawer-close");
        if (!wrapped) fails.push(`${label}:focusTrapNoWrap`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(280);
        const afterEsc = await page.evaluate(() => ({
          open: document.querySelector(".actions-root")?.className.includes("open"),
          focusBack: document.activeElement?.className === "actions-toggle",
          bodyOverflow: getComputedStyle(document.body).overflow,
        }));
        if (afterEsc.open) fails.push(`${label}:escDidNotClose`);
        if (!afterEsc.focusBack) fails.push(`${label}:escFocusNotRestored`);
        if (afterEsc.bodyOverflow === "hidden") fails.push(`${label}:escScrollStillLocked`);
        if (consoleErrs.length) fails.push(`${label}:console:${consoleErrs[0]}`);
      });

      // 바깥(패널 밖) 클릭 → 닫힘
      await withJourneyPage(browser, vp, async (page) => {
        await page.click(".actions-toggle");
        await page.waitForTimeout(280);
        await page.click(".drawer-backdrop", { position: { x: 10, y: vp[1] - 10 } });
        await page.waitForTimeout(280);
        const open = await page.evaluate(() => document.querySelector(".actions-root")?.className.includes("open"));
        if (open) fails.push(`${label}:outsideClickDidNotClose`);
      });

      // 닫기 버튼 클릭 → 닫힘
      await withJourneyPage(browser, vp, async (page) => {
        await page.click(".actions-toggle");
        await page.waitForTimeout(280);
        await page.click(".actions-panel .drawer-close");
        await page.waitForTimeout(280);
        const open = await page.evaluate(() => document.querySelector(".actions-root")?.className.includes("open"));
        if (open) fails.push(`${label}:closeButtonDidNotClose`);
      });

      // 브라우저 뒤로가기 → 패널부터 닫힘(페이지 이탈 아님)
      await withJourneyPage(browser, vp, async (page) => {
        await page.click(".actions-toggle");
        await page.waitForTimeout(280);
        await page.goBack();
        await page.waitForTimeout(280);
        const state = await page.evaluate(() => ({
          open: document.querySelector(".actions-root")?.className.includes("open"),
          hasToggle: !!document.querySelector(".actions-toggle"),
        }));
        if (state.open) fails.push(`${label}:backButtonDidNotClose`);
        if (!state.hasToggle) fails.push(`${label}:backButtonLeftPage`);
      });

      // "모델 변경" 클릭 → 패널 닫히고 모델 다이얼로그 오픈
      await withJourneyPage(browser, vp, async (page) => {
        await page.click(".actions-toggle");
        await page.waitForTimeout(280);
        await page.click(".actions-model-row button");
        await page.waitForTimeout(280);
        const state = await page.evaluate(() => ({
          panelOpen: document.querySelector(".actions-root")?.className.includes("open"),
          dialogOpen: document.querySelector(".model-dialog")?.open === true,
        }));
        if (state.panelOpen) fails.push(`${label}:modelChangeDidNotClosePanel`);
        if (!state.dialogOpen) fails.push(`${label}:modelChangeDidNotOpenDialog`);
      });

      if (OUT && engineName === "webkit" && [375, 390, 430].includes(vp[0])) {
        await withJourneyPage(browser, vp, async (page) => {
          await page.click(".actions-toggle");
          await page.waitForTimeout(280);
          await page.screenshot({ path: `${OUT}/actions-open-${vp[0]}-webkit.png` });
        });
      }
    }

    // 데스크톱 1440 회귀: 액션 토글 완전 비활성, 기존 .top-actions 유지
    await (async () => {
      const page = await browser.newPage({ viewport: { width: DESKTOP[0], height: DESKTOP[1] } });
      await enterJourney(page);
      const r = await page.evaluate(() => ({
        toggleDisplay: getComputedStyle(document.querySelector(".actions-toggle")).display,
        topActionsDisplay: getComputedStyle(document.querySelector(".top-actions")).display,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      if (r.toggleDisplay !== "none") fails.push(`desktop:${engineName}:toggleVisible`);
      if (r.topActionsDisplay === "none") fails.push(`desktop:${engineName}:topActionsHidden`);
      if (r.overflowX > 0) fails.push(`desktop:${engineName}:overflowX=${r.overflowX}`);
      await page.evaluate(() => document.querySelector(".actions-root")?.classList.add("open"));
      const forcedOpenDisplay = await page.evaluate(() => getComputedStyle(document.querySelector(".actions-root")).display);
      if (forcedOpenDisplay !== "none") fails.push(`desktop:${engineName}:panelNotFullyDisabled`);
      if (OUT) await page.screenshot({ path: `${OUT}/actions-desktop-1440-${engineName}.png` });
      await page.close();
    })();

    await browser.close();
  }

  if (OUT) fs.writeFileSync(`${OUT}/actions-menu-verify-fails.json`, JSON.stringify(fails, null, 2));
  if (fails.length) {
    console.error(`actions-menu-verify FAIL (${fails.length} issues)`);
    fails.slice(0, 30).forEach((f) => console.error("  " + f));
    process.exit(1);
  }
  console.log("actions-menu-verify PASS (360-430 x Chromium/WebKit: closed-state 단일행, 열기/닫기 4종 트리거, focus trap+복귀, 뒤로가기, body 잠금, 44px, 텍스트 클리핑 0, 모델 변경 연동, 데스크톱 1440 회귀 0)");
})();
