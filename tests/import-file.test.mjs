// Gate 6(#42): 파일 가져오기 검증 단위 테스트
import test from "node:test";
import assert from "node:assert/strict";
import { validateImportFile, previewText, IMPORT_MAX_BYTES, AI_ORGANIZE_PROMPT } from "../app/lib/import-file.ts";

test("TXT·MD만 허용하고 이유를 사용자 언어로 준다", () => {
  assert.equal(validateImportFile({ name: "노트.txt", type: "text/plain", size: 100 }).ok, true);
  assert.equal(validateImportFile({ name: "기록.md", type: "text/markdown", size: 100 }).ok, true);
  assert.equal(validateImportFile({ name: "기록.MD", type: "", size: 100 }).ok, true); // 대소문자·빈 MIME 허용
  const pdf = validateImportFile({ name: "이력서.pdf", type: "application/pdf", size: 100 });
  assert.equal(pdf.ok, false);
  assert.match(pdf.reason, /TXT와 Markdown/);
  const spoof = validateImportFile({ name: "속임수.txt", type: "application/octet-stream", size: 100 });
  assert.equal(spoof.ok, false); // 확장자만 맞고 MIME이 이상한 경우 거부
});

test("용량 상한과 빈 파일을 거부한다", () => {
  assert.equal(validateImportFile({ name: "big.txt", type: "text/plain", size: IMPORT_MAX_BYTES + 1 }).ok, false);
  assert.equal(validateImportFile({ name: "empty.txt", type: "text/plain", size: 0 }).ok, false);
});

test("미리보기는 표시만 자르고 truncated를 표시한다", () => {
  const short = previewText("짧은 내용");
  assert.equal(short.truncated, false);
  const long = previewText("가".repeat(700));
  assert.equal(long.truncated, true);
  assert.equal(long.preview.length, 600);
});

test("정리 프롬프트는 개인정보 제외·사실 위주·확인 필요 규칙을 포함한다", () => {
  assert.match(AI_ORGANIZE_PROMPT, /개인정보는 빼 줘/);
  assert.match(AI_ORGANIZE_PROMPT, /부풀리지 마/);
  assert.match(AI_ORGANIZE_PROMPT, /확인 필요/);
});
