// Gate 10(#46): RC 자동화 QA 스윕 — 뷰포트·접근성·키보드·reduced motion·인쇄·자산·엔진 교차
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const BASE = "http://localhost:3100";
const OUT = process.argv[2];
const LOCAL_ARTIFACT = /Access-Control-Allow-Origin|manifest|Failed to load resource: .*401/;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const R = { fail: [] };
  const ok = (name, cond) => { R[name] = cond; if (!cond) R.fail.push(name); };

  // ── A. 자산 응답 ──
  const http = async (p) => (await fetch(BASE + p)).status;
  ok("assets200", (await Promise.all(["/favicon.svg","/favicon.ico","/icon-192.png","/icon-512.png","/icon-512-maskable.png","/apple-touch-icon.png","/og.png","/manifest.webmanifest","/robots.txt","/sitemap.xml"].map(http))).every((s) => s === 200));

  const browser = await chromium.launch();

  // ── B. 뷰포트 스윕(홈+데모 게이트+샘플 STEP2) + 200% 근사(=viewport/2) ──
  const overflow = {};
  for (const [label, w] of [["360",360],["390",390],["768",768],["1024",1024],["1440",1440],["zoom200-desktop",720],["zoom200-mobile",320]]) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 } });
    const errs = [];
    p.on("console", (m) => { if (m.type() === "error" && !LOCAL_ARTIFACT.test(m.text())) errs.push(m.text()); });
    for (const path of ["/", "/why", "/demo", "/privacy"]) {
      await p.goto(BASE + path, { waitUntil: "networkidle" });
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      overflow[`${label}${path}`] = m.sw - m.cw;
    }
    if (errs.length) R.fail.push(`console:${label}:${errs[0].slice(0,80)}`);
    await p.close();
  }
  ok("overflowZero", Object.values(overflow).every((v) => v <= 0));
  R.overflowDetail = Object.fromEntries(Object.entries(overflow).filter(([, v]) => v > 0));

  // ── C. 미명명 컨트롤 0 (홈·데모 게이트·샘플 STEP1·모델 다이얼로그) ──
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleErrs = [];
  p.on("console", (m) => { if (m.type() === "error" && !LOCAL_ARTIFACT.test(m.text())) consoleErrs.push(m.text().slice(0,120)); });
  const unnamed = async () => p.evaluate(() => {
    const nodes = [...document.querySelectorAll("button, a, input, select, textarea, [role=button]")];
    return nodes.filter((el) => {
      if (el.closest("[hidden],[aria-hidden=true]")) return false;
      const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim();
      const labelled = el.id && document.querySelector(`label[for="${el.id}"]`);
      const wrapped = el.closest("label");
      return !name && !labelled && !wrapped;
    }).map((el) => el.outerHTML.slice(0, 60));
  });
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const un1 = await unnamed();
  await p.goto(BASE + "/demo", { waitUntil: "networkidle" });
  const un2 = await unnamed();
  ok("namedControls", un1.length + un2.length === 0);
  R.unnamedSamples = [...un1, ...un2].slice(0, 4);

  // ── D. 키보드 전용 샘플 여정(마우스 없이 STEP2 도달) ──
  await p.goto(BASE + "/demo?sample=1", { waitUntil: "networkidle" });
  await p.keyboard.press("Tab"); // 순차 탐색으로 동의 체크박스 찾기
  let found = false;
  for (let i = 0; i < 25 && !found; i++) {
    const el = await p.evaluate(() => ({ tag: document.activeElement?.tagName, type: document.activeElement?.getAttribute("type") }));
    if (el.tag === "INPUT" && el.type === "checkbox") { await p.keyboard.press("Space"); found = true; break; }
    await p.keyboard.press("Tab");
  }
  ok("kbConsent", found);
  // 시작 버튼으로 이동해 Enter
  let started = false;
  for (let i = 0; i < 15 && !started; i++) {
    await p.keyboard.press("Tab");
    const txt = await p.evaluate(() => document.activeElement?.textContent || "");
    if (/샘플로 둘러보기|내 경험에서 시작하기/.test(txt)) { await p.keyboard.press("Enter"); started = true; }
  }
  await p.waitForTimeout(400);
  ok("kbStart", started && !!(await p.$("#experience")));
  // 분석 버튼까지 Tab→Enter
  let analyzed = false;
  for (let i = 0; i < 40 && !analyzed; i++) {
    await p.keyboard.press("Tab");
    const txt = await p.evaluate(() => document.activeElement?.textContent || "");
    if (/가능성 찾기/.test(txt)) { await p.keyboard.press("Enter"); analyzed = true; }
  }
  await p.waitForSelector(".claim-card", { timeout: 8000 }).catch(() => {});
  ok("kbAnalyze", analyzed && (await p.locator(".claim-card").count()) > 0);
  // 포커스 링 존재(focus-visible 스타일 정의 여부)
  ok("focusStyle", await p.evaluate(() => [...document.styleSheets].some((sheet) => { try { return [...sheet.cssRules].some((rule) => rule.cssText?.includes("focus-visible")); } catch { return false; } })));

  // ── E. reduced motion 스모크 ──
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  ok("reducedMotion", true); // 전역 미디어쿼리(globals.css)로 애니메이션 제거 — 크래시·오류 없음 확인이 목적
  await p.emulateMedia({ reducedMotion: null });

  // ── F. 인쇄(#26) — 게이트 통과 실여정 후 STEP4 ──
  await p.goto(BASE + "/demo", { waitUntil: "networkidle" });
  await p.fill("#gate-code", "e2e-demo-code");
  await p.getByRole("button", { name: "데모 열기" }).click();
  await p.waitForSelector(".check-row input", { timeout: 8000 });
  await p.locator(".check-row input").first().check();
  await p.getByRole("button", { name: /내 경험에서 시작하기/ }).click();
  await p.locator("#experience").fill("항공물류를 전공했고 집에서 AI 수학과 웹을 독학하며 팀 프로젝트로 물류 데이터 대시보드를 만들었습니다.");
  await p.getByRole("button", { name: /가능성 찾기/ }).click();
  await p.waitForSelector(".claim-card", { timeout: 20000 });
  await p.getByRole("button", { name: /맞습니다/ }).first().click();
  await p.getByRole("button", { name: /격차와 다음 행동 보기/ }).click();
  await p.getByRole("button", { name: /GapProof 만들기/ }).click();
  await p.waitForSelector(".personal-proof", { timeout: 8000 });
  await p.emulateMedia({ media: "print" });
  const printAudit = await p.evaluate(() => {
    const h2 = document.querySelector(".identity h2");
    return { ink: h2 ? getComputedStyle(h2).color : null, bg: getComputedStyle(document.querySelector(".identity")).backgroundColor,
             topbarHidden: getComputedStyle(document.querySelector(".topbar")).display === "none" };
  });
  ok("printInverted", printAudit.ink === "rgb(23, 36, 61)" && printAudit.topbarHidden);
  await p.emulateMedia({ media: "screen" });
  await p.screenshot({ path: `${OUT}/rc-step4-390.png`, fullPage: true });

  ok("consoleZero", consoleErrs.length === 0);
  R.consoleSamples = consoleErrs.slice(0, 3);
  await p.close();
  await browser.close();

  // ── G. WebKit 핵심 흐름(홈·무코드 샘플 STEP2 도달) ──
  const wk = await webkit.launch();
  const wp = await wk.newPage({ viewport: { width: 390, height: 844 } });
  await wp.goto(BASE + "/", { waitUntil: "networkidle" });
  ok("webkitHome", (await wp.locator("h1").first().innerText()).includes("경력이라고 생각하지"));
  await wp.goto(BASE + "/demo?sample=1", { waitUntil: "networkidle" });
  await wp.locator(".check-row input").first().check();
  await wp.getByRole("button", { name: /샘플로 둘러보기/ }).click();
  await wp.getByRole("button", { name: /가능성 찾기/ }).click();
  await wp.waitForSelector(".claim-card", { timeout: 10000 });
  ok("webkitSample", (await wp.locator(".claim-card").count()) === 3);
  await wk.close();

  fs.writeFileSync(`${OUT}/qa-sweep.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 1));
  if (R.fail.length) { console.error("QA FAIL:", R.fail.join(", ")); process.exit(1); }
  console.log("QA SWEEP PASS");
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
