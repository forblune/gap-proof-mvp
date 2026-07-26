// Gate 1(#35) 통합 검증 — draft 복원·세션 만료·잠금·삭제 (로컬 하네스, Solar 무호출)
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");
const BASE = "http://localhost:3100";
const OUT = process.argv[2];
const ENGINE = process.argv[3] || "chromium";
const TEXT = "draft 복원 검증용 사용자 입력입니다. 항공물류를 전공했고 집에서 독학했습니다.";

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const r = { engine: ENGINE };
  const browser = await (ENGINE === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  // 오류 원문 출력용


  const login = async () => {
    await page.fill("#gate-code", "e2e-demo-code");
    await page.getByRole("button", { name: "데모 열기" }).click();
    // 재인증 시 보존된 단계로 복귀하므로 특정 STEP 요소가 아니라 게이트 소멸을 기다린다
    await page.waitForSelector("#gate-code", { state: "detached", timeout: 8000 });
    await page.waitForTimeout(200);
  };

  // 1) step1에서 입력 → 새로고침 → 복원
  await page.goto(BASE + "/demo", { waitUntil: "networkidle" });
  await login();
  await page.locator(".check-row input").first().check();
  await page.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();
  await page.locator("#experience").fill(TEXT);
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: "networkidle" });
  r.reloadKeepsStep1 = !!(await page.$("#experience"));
  r.reloadKeepsText = (await page.locator("#experience").inputValue()) === TEXT;

  // 2) 분석(샘플) → step2 → 새로고침 → 주장·단계 복원
  await page.getByRole("button", { name: /가능성 찾기/ }).click();
  await page.waitForSelector(".claim-card", { timeout: 20000 });
  const claimCount = await page.locator(".claim-card").count();
  await page.getByRole("button", { name: /맞아요/ }).first().click();
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".claim-card", { timeout: 8000 });
  r.reloadKeepsStep2 = (await page.locator(".claim-card").count()) === claimCount;
  r.reloadKeepsConfirm = (await page.locator(".claim-card .confirm[disabled], .claim-card button:has-text('맞아요')").count()) >= 0 &&
    ((await page.locator("main").innerText()).includes("1개 확인됨"));

  // 3) 세션 만료: 쿠키 삭제 → 분석 클릭 → 게이트 + 만료 문구 + 상태 유지 → 재인증 → 그 자리 복귀
  await ctx.clearCookies();
  await page.getByRole("button", { name: /이전/ }).click(); // step1로
  await page.getByRole("button", { name: /가능성 찾기/ }).click();
  await page.waitForSelector("#gate-code", { timeout: 8000 });
  const noticeText = await page.locator(".notice").textContent().catch(() => "");
  r.expiredNotice = (noticeText ?? "").includes("만료");
  await login();
  r.reauthKeepsText = (await page.locator("#experience").inputValue().catch(() => "")) === TEXT;
  await page.screenshot({ path: path.join(OUT, `${ENGINE}-after-reauth.png`) });

  // 4) 잠금 → draft 소거 + 재인증 시 초기 상태
  await page.getByRole("button", { name: /데모 나가기/ }).click();
  await page.waitForSelector("#gate-code", { timeout: 8000 });
  r.lockClearsDraft = await page.evaluate(() => window.localStorage.getItem("gp_draft_v1") === null);
  await page.reload({ waitUntil: "networkidle" });
  await login();
  r.afterLockPristine = ((await page.locator("main").innerText()).includes("내 경험에서 시작하기"));

  // 5) 진행 후 삭제 → draft 소거
  await page.locator(".check-row input").first().check();
  await page.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();
  await page.locator("#experience").fill(TEXT);
  await page.waitForTimeout(300);
  r.draftExistsBeforeDelete = await page.evaluate(() => window.localStorage.getItem("gp_draft_v1") !== null);
  await page.getByRole("button", { name: /새 분석 시작하기/ }).click();
  await page.locator(".confirm-bar button.danger").click();
  await page.waitForTimeout(300);
  r.deleteClearsDraft = await page.evaluate(() => window.localStorage.getItem("gp_draft_v1") === null);

  // 의도적으로 유발한 401(세션 만료 시나리오)의 브라우저 네트워크 로그는 앱 오류가 아니므로 제외
  const appErrors = errors.filter((t) => !/Failed to load resource: .*401/.test(t));
  r.consoleErrors = appErrors.length;
  r.consoleErrorTexts = appErrors.slice(0, 5);
  r.expected401NetworkLogs = errors.length - appErrors.length;
  fs.writeFileSync(path.join(OUT, `${ENGINE}-draft-verify.json`), JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
  const pass = ["reloadKeepsStep1","reloadKeepsText","reloadKeepsStep2","reloadKeepsConfirm","expiredNotice","reauthKeepsText","lockClearsDraft","afterLockPristine","draftExistsBeforeDelete","deleteClearsDraft"].every((k) => r[k]);
  if (!pass || r.consoleErrors) { console.error("VERIFY FAIL"); process.exit(1); }
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
