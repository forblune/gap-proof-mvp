const { chromium } = require("playwright");
const fs = require("fs");
const OUT = process.argv[2];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  const r = {};
  await p.goto("http://localhost:3100/demo", { waitUntil: "networkidle" });
  await p.fill("#gate-code", "e2e-demo-code");
  await p.getByRole("button", { name: "데모 열기" }).click();
  await p.waitForSelector(".check-row input", { timeout: 8000 });
  await p.locator(".check-row input").first().check();
  await p.getByRole("button", { name: /샘플 여정 시작하기/ }).click();

  // 1) AI 프롬프트 복사
  await p.getByText("이미 사용하는 AI가 있나요?").click();
  r.nonAssertLabel = (await p.locator(".import-guide").first().innerText()).includes("확정된 사실이 아니라 초안");
  await p.getByRole("button", { name: "정리 프롬프트 복사" }).click();
  await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  r.promptCopied = clip.includes("개인정보는 빼 줘");
  r.copyNotice = (await p.locator(".notice").innerText()).includes("복사했어요");

  // 2) 파일: 잘못된 확장자 → 거부
  await p.getByText("메모 파일이 있나요?").click();
  const input = p.locator('input[type="file"]');
  await input.setInputFiles("import-fixtures/fake.pdf");
  await p.waitForTimeout(300);
  r.rejectPdf = (await p.locator(".notice").innerText()).includes("TXT와 Markdown");

  // 3) 용량 초과 → 거부
  await input.setInputFiles("import-fixtures/big.txt");
  await p.waitForTimeout(300);
  r.rejectBig = (await p.locator(".notice").innerText()).includes("200KB");

  // 4) 정상 TXT → 미리보기 → 추가 → 입력 반영(자동 반영 아님을 먼저 확인)
  await input.setInputFiles("import-fixtures/note.txt");
  await p.waitForSelector(".import-preview", { timeout: 5000 });
  r.previewShown = (await p.locator(".import-preview b").innerText()) === "note.txt";
  r.notAutoInserted = !(await p.locator("#experience").inputValue()).includes("마감 알바");
  await p.screenshot({ path: `${OUT}/import-preview-390.png` });
  await p.getByRole("button", { name: "입력에 추가" }).click();
  await p.waitForTimeout(300);
  r.inserted = (await p.locator("#experience").inputValue()).includes("신입 교육 노트");
  r.previewGone = !(await p.locator(".import-preview").count());

  await b.close();
  console.log(JSON.stringify(r, null, 1));
  fs.writeFileSync(`${OUT}/import-verify.json`, JSON.stringify(r, null, 2));
  if (!Object.values(r).every(Boolean)) { console.error("VERIFY FAIL"); process.exit(1); }
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
