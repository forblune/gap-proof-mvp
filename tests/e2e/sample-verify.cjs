const { chromium } = require("playwright");
const fs = require("fs");
const OUT = process.argv[2];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const r = { analyzeCalls: 0 };
  p.on("request", (req) => { if (req.url().includes("/api/analyze")) r.analyzeCalls += 1; });

  // 1) URL 직접 진입 — 게이트 없이 샘플
  await p.goto("http://localhost:3100/demo?sample=1", { waitUntil: "networkidle" });
  r.noGate = !(await p.$("#gate-code"));
  r.strip = (await p.locator(".sample-strip").count()) === 1;
  await p.screenshot({ path: `${OUT}/sample-entry-390.png` });

  // 2) 전체 여정(분석 API 0회)
  await p.locator(".check-row input").first().check();
  await p.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();
  await p.getByRole("button", { name: /가능성 찾기/ }).click();
  await p.waitForSelector(".claim-card", { timeout: 8000 });
  r.sampleNotice = (await p.locator("main").innerText()).includes("샘플 체험 중이에요");
  r.badgeSample = ((await p.locator(".sample-badge").first().textContent()) ?? "").includes("샘플");
  await p.getByRole("button", { name: /맞습니다/ }).first().click();
  await p.getByRole("button", { name: /격차와 다음 행동 보기/ }).click();
  await p.getByRole("button", { name: /GapProof 만들기/ }).click();
  await p.waitForSelector(".personal-proof", { timeout: 8000 });
  r.step4 = true;
  r.restartLabel = (await p.locator("main").innerText()).includes("체험 처음부터 시작하기");
  await p.screenshot({ path: `${OUT}/sample-step4-390.png`, fullPage: true });

  // 3) 나가기 → 게이트 복귀 · draft 미오염
  r.draftUntouched = await p.evaluate(() => window.localStorage.getItem("gp_draft_v1") === null);
  await p.getByRole("button", { name: /체험 나가기/ }).click();
  await p.waitForSelector("#gate-code", { timeout: 8000 });
  r.exitToGate = true;
  r.gateSampleButton = (await p.getByRole("button", { name: /코드 없이 샘플 둘러보기/ }).count()) === 1;

  // 4) 게이트 버튼으로 재진입
  await p.getByRole("button", { name: /코드 없이 샘플 둘러보기/ }).click();
  await p.waitForSelector(".sample-strip", { timeout: 8000 });
  r.reenter = true;

  await b.close();
  console.log(JSON.stringify(r, null, 1));
  fs.writeFileSync(`${OUT}/sample-verify.json`, JSON.stringify(r, null, 2));
  const keys = ["noGate","strip","sampleNotice","badgeSample","step4","restartLabel","draftUntouched","exitToGate","gateSampleButton","reenter"];
  if (!keys.every((k) => r[k]) || r.analyzeCalls !== 0) { console.error("VERIFY FAIL"); process.exit(1); }
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
