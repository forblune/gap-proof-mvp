const { chromium } = require("playwright");
const fs = require("fs");
const OUT = process.argv[2];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const r = {};
  let lastBody = null;
  p.on("request", (req) => { if (req.url().includes("/api/analyze") && req.method() === "POST") lastBody = req.postDataJSON(); });
  await p.goto("http://localhost:3100/demo", { waitUntil: "networkidle" });
  await p.fill("#gate-code", "e2e-demo-code");
  await p.getByRole("button", { name: "데모 열기" }).click();
  // #69: 390px에서는 .top-actions가 감춰지고 "⋯" 액션 메뉴로 대체된다
  await p.waitForSelector(".actions-toggle", { timeout: 8000 });
  await p.click(".actions-toggle");
  await p.waitForSelector(".actions-model-row b", { timeout: 8000 });
  r.summaryDefault = (await p.locator(".actions-model-row b").textContent()).includes("Solar Pro 3");

  // 열기 → 바텀시트 + 공식/자체/평가 중 구분 + 라디오
  await p.click(".actions-model-row button");
  await p.waitForSelector(".model-dialog[open]", { timeout: 5000 });
  const dtext = await p.locator(".model-dialog").innerText();
  r.sourceSplit = dtext.includes("[공식]") && dtext.includes("[자체]") && dtext.includes("평가 중");
  r.radios = (await p.locator('.model-card input[type="radio"]').count()) === 3;
  await p.screenshot({ path: `${OUT}/model-sheet-390.png` });

  // Esc 닫기(네이티브 focus trap 계열) → 재열기(액션 메뉴부터) → Mini 선택 적용
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  r.escCloses = !(await p.locator(".model-dialog[open]").count());
  await p.click(".actions-toggle");
  await p.click(".actions-model-row button");
  await p.getByText("Solar Mini", { exact: false }).first().click();
  await p.getByRole("button", { name: "이 모델 사용" }).click();
  await p.waitForTimeout(300);
  await p.click(".actions-toggle");
  r.summaryUpdated = (await p.locator(".actions-model-row b").textContent()).includes("Solar Mini");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);

  // 선택값이 API 요청 본문과 일치(무과금: 키 없음 → 서버 샘플 폴백)
  await p.locator(".check-row input").first().check();
  await p.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();
  await p.locator("#experience").fill("모델 선택 일치 검증용 입력입니다. 스물자 이상 채웁니다.");
  await p.getByRole("button", { name: /가능성 찾기/ }).click();
  await p.waitForSelector(".claim-card", { timeout: 20000 });
  r.requestModelMatches = lastBody && lastBody.model === "solar-mini";

  await b.close();
  console.log(JSON.stringify(r, null, 1));
  fs.writeFileSync(`${OUT}/model-verify.json`, JSON.stringify(r, null, 2));
  if (!Object.values(r).every(Boolean)) { console.error("VERIFY FAIL"); process.exit(1); }
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
