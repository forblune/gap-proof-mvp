// #67: 모바일 홈 헤더·Hero 겹침 검사 — getBoundingClientRect 교차 면적 기반.
// qa-sweep의 overflow-x 검사는 세로 스필로 인한 요소 겹침을 못 본다(실기기 iPhone Safari FAIL의 원인).
// 뷰포트 5종(+200% 확대 근사 320px) × Chromium/WebKit × iOS 텍스트 확대 근사(내비·eyebrow 1.4배)로
// 교차 면적 0 · 헤더 스필 0 · 단어 내 줄바꿈 위험 0 · overflow 0 · 44px 터치 목표 · 콘솔 오류 0을 강제한다.
const { chromium, webkit, firefox } = require("playwright");
const fs = require("fs");
const BASE = "http://localhost:3100";
const OUT = process.argv[2];
const LOCAL_ARTIFACT = /Access-Control-Allow-Origin|manifest|Failed to load resource: .*401/; // qa-sweep과 동일: 로컬 하네스 한정 아티팩트

// 360~430: 실기기 폭 스펙트럼. 320: 텍스트 확대 200% 근사(기존 qa-sweep 컨벤션). 1440: 데스크톱 회귀.
const VIEWPORTS = [[320, 700], [360, 800], [375, 812], [390, 844], [393, 852], [430, 932], [1440, 900]];

async function inspect(page, stress) {
  if (stress) await page.addStyleTag({ content: ".info-nav a, .eyebrow { font-size: 1.4em !important; }" });
  return page.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const overlap = (a, b) => {
      if (!a || !b) return 0;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return w > 1 && h > 1 ? Math.round(w * h) : 0; // 1px 미만 접촉은 렌더링 오차로 허용
    };
    const header = document.querySelector(".home .topbar");
    const navItems = [...document.querySelectorAll(".home .info-nav a")];
    const eyebrow = document.querySelector(".home-hero .eyebrow");
    const cta = document.querySelector(".home .nav-cta");
    const h1 = document.querySelector(".home-hero h1");
    const fails = [];
    // ① 내비 항목 상호(CTA 포함 — nav-cta는 .info-nav a에 포함됨)
    for (let i = 0; i < navItems.length; i++)
      for (let j = i + 1; j < navItems.length; j++) {
        const a = overlap(r(navItems[i]), r(navItems[j]));
        if (a) fails.push(`nav[${i}]xnav[${j}]=${a}`);
      }
    // ② 내비 ↔ Hero 과정 문구 / 제목
    for (const [name, el] of [["eyebrow", eyebrow], ["h1", h1]])
      for (let i = 0; i < navItems.length; i++) {
        const a = overlap(r(navItems[i]), r(el));
        if (a) fails.push(`nav[${i}]x${name}=${a}`);
      }
    // ③ Hero 과정 문구/제목 ↔ 데모 열기 CTA
    for (const [pair, a, b] of [["eyebrowXcta", eyebrow, cta], ["h1Xcta", h1, cta]]) {
      const s = overlap(r(a), r(b));
      if (s) fails.push(`${pair}=${s}`);
    }
    // ④ 헤더 박스 침범: 스크롤 0에서 헤더 하단이 hero 시작을 넘으면 안 됨
    const hb = r(header);
    const eb = r(eyebrow);
    if (hb && eb && hb.bottom - 2 > eb.top) fails.push(`headerSpill=${Math.round(hb.bottom - eb.top)}`);
    // ⑤ 헤더 자식이 헤더 박스 밖으로(고정 높이 스필의 직접 신호)
    const navBottom = Math.max(...navItems.map((n) => r(n).bottom));
    if (hb && navBottom - 2 > hb.bottom) fails.push(`navSpill=${Math.round(navBottom - hb.bottom)}`);
    // ⑥ 제목 클리핑·단어 내 줄바꿈 방지 선언
    if (h1 && h1.scrollWidth > h1.clientWidth + 1) fails.push("h1Clip");
    if (h1 && getComputedStyle(h1).wordBreak !== "keep-all") fails.push("h1NoKeepAll");
    if (eyebrow && getComputedStyle(eyebrow).wordBreak !== "keep-all") fails.push("eyebrowNoKeepAll");
    // ⑦ 가로 overflow(기존 기준 유지)
    const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (ov > 0) fails.push(`overflowX=${ov}`);
    // ⑧ 터치 목표: 실제 렌더되는(보이는) 내비 링크만 44px 검사(#68: 모바일은 .info-nav가 숨겨지고
    // 드로어가 대체 — 드로어 자체의 44px는 drawer-verify.cjs가 별도로 검증한다)
    const visibleNav = navItems.filter((n) => n.offsetParent !== null);
    const short = visibleNav.filter((n) => r(n).height < 43.5).length;
    if (short) fails.push(`touchUnder44=${short}`);
    return { fails, headerBottom: hb ? Math.round(hb.bottom) : null, eyebrowTop: eb ? Math.round(eb.top) : null };
  });
}

(async () => {
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const results = {};
  const failures = [];
  for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit], ["firefox", firefox]]) {
    const browser = await engine.launch();
    for (const [w, h] of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const consoleErrs = [];
      page.on("console", (m) => { if (m.type() === "error" && !LOCAL_ARTIFACT.test(m.text())) consoleErrs.push(m.text().slice(0, 100)); });
      await page.goto(BASE + "/", { waitUntil: "networkidle" });
      const modes = w >= 1440 ? [["normal", false]] : [["normal", false], ["stress140", true]]; // 데스크톱은 iOS 확대 근사 불필요
      for (const [mode, stress] of modes) {
        const key = `${engineName}-${w}-${mode}`;
        const res = await inspect(page, stress);
        if (consoleErrs.length) res.fails.push(`console:${consoleErrs[0]}`);
        results[key] = res;
        if (res.fails.length) failures.push(`${key}: ${res.fails.slice(0, 4).join(", ")}`);
      }
      // 데스크톱 회귀 확인: 헤더는 여전히 sticky여야 한다(모바일만 static으로 완화)
      if (w === 1440) {
        const pos = await page.evaluate(() => getComputedStyle(document.querySelector(".home .topbar")).position);
        if (pos !== "sticky") failures.push(`desktop-sticky-regressed:${pos}`);
      }
      if (OUT && engineName === "webkit" && [375, 390, 430, 1440].includes(w)) {
        await page.evaluate(() => location.reload()); // stress 스타일 제거 후 캡처
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: `${OUT}/home-${w}-webkit.png` });
      }
      await page.close();
    }
    await browser.close();
  }
  if (OUT) fs.writeFileSync(`${OUT}/home-collision-results.json`, JSON.stringify(results, null, 2));
  const cases = Object.keys(results).length;
  if (failures.length) {
    console.error(`home-collision-verify FAIL (${failures.length}/${cases} cases)`);
    failures.slice(0, 12).forEach((f) => console.error("  " + f));
    process.exit(1);
  }
  console.log(`home-collision-verify PASS (${cases} cases: 7 viewports x 2 engines x zoom modes, 교차 0·스필 0·클리핑 0)`);
})();
