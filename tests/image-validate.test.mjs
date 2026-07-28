// 첨부 이미지 검증 — 확장자·신고 MIME이 아니라 실제 바이트로 판정하는지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import {
  checkImage,
  detectImageType,
  attachmentPath,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
} from "../app/lib/image-validate.ts";

const png = () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = () => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const webp = () =>
  Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0]);
const gif = () => Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]);
const svg = () => new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
const elf = () => Uint8Array.from([0x7f, 0x45, 0x4c, 0x46, 0, 0, 0, 0]);

test("PNG · JPEG · WebP 시그니처를 정확히 판정한다", () => {
  assert.equal(detectImageType(png()), "image/png");
  assert.equal(detectImageType(jpeg()), "image/jpeg");
  assert.equal(detectImageType(webp()), "image/webp");
});

test("허용 목록 3종만 통과한다", () => {
  assert.equal(checkImage(png(), "image/png", 1000).ok, true);
  assert.equal(checkImage(jpeg(), "image/jpeg", 1000).ok, true);
  assert.equal(checkImage(webp(), "image/webp", 1000).ok, true);
});

test("SVG는 거부한다 — 스크립트를 담을 수 있다", () => {
  const result = checkImage(svg(), "image/svg+xml", 1000);
  assert.equal(result.ok, false);
  assert.match(result.reason, /PNG|JPEG|WebP/);
});

test("GIF와 실행 파일은 거부한다", () => {
  assert.equal(checkImage(gif(), "image/gif", 1000).ok, false);
  assert.equal(checkImage(elf(), "application/octet-stream", 1000).ok, false);
});

test("MIME 위조를 잡는다 — SVG를 image/png라고 신고해도 통과하지 못한다", () => {
  const result = checkImage(svg(), "image/png", 1000);
  assert.equal(result.ok, false);
});

test("확장자만 바꾼 위조를 잡는다 — 실제는 JPEG인데 PNG라고 신고", () => {
  const result = checkImage(jpeg(), "image/png", 1000);
  assert.equal(result.ok, false);
  assert.match(result.reason, /일치하지 않습니다/);
});

test("5MB 초과는 거부하고 경계값은 허용한다", () => {
  assert.equal(checkImage(png(), "image/png", MAX_ATTACHMENT_BYTES).ok, true);
  const over = checkImage(png(), "image/png", MAX_ATTACHMENT_BYTES + 1);
  assert.equal(over.ok, false);
  assert.match(over.reason, /5MB/);
});

test("빈 파일은 거부한다", () => {
  const result = checkImage(png(), "image/png", 0);
  assert.equal(result.ok, false);
});

test("첨부 상한은 3장이다", () => {
  assert.equal(MAX_ATTACHMENTS, 3);
});

test("저장 경로 첫 segment가 user_id여서 Storage 정책이 격리할 수 있다", () => {
  const path = attachmentPath("user-1", "fb-2", "file-3", "png");
  assert.equal(path, "user-1/fb-2/file-3.png");
  assert.equal(path.split("/")[0], "user-1");
});

test("판정 결과가 저장 확장자를 정해 준다(신고값이 아니라 실제 형식 기준)", () => {
  const result = checkImage(jpeg(), "image/jpeg", 1000);
  assert.equal(result.ok, true);
  assert.equal(result.extension, "jpg");
  assert.equal(result.mime, "image/jpeg");
});
