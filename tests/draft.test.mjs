// Gate 1(#35): draft 직렬화·검증 단위 테스트 (Node 타입 스트리핑으로 .ts 직접 임포트)
import test from "node:test";
import assert from "node:assert/strict";
import { DRAFT_KEY, DRAFT_MAX_EXPERIENCE, serializeDraft, parseDraft, loadDraft, saveDraft, clearDraft } from "../app/lib/draft.ts";

const claim = (over = {}) => ({
  id: 1, skill: "테스트 역량", quote: "원문 인용", source: "사용자 입력",
  tier: 0, confidence: "높음", question: "질문?", status: "pending", ...over,
});

const base = () => ({
  step: 2,
  storeConsent: true,
  aggregateConsent: false,
  experience: "항공물류를 전공했고 집에서 독학했습니다.",
  claims: [claim(), claim({ id: 2, status: "confirmed", link: "https://example.com" })],
  roleId: "ai_pm",
  passedChecks: { problem_framing: true },
  analysisSource: "sample",
  analysisModel: null,
  modelId: "solar-pro3",
  analysisNotice: "샘플 고지",
  selectedAction: "project",
  proofDate: null,
});

test("직렬화→파싱 왕복이 전 필드를 보존한다", () => {
  const d = parseDraft(serializeDraft(base(), "2026-07-25T00:00:00.000Z"));
  assert.ok(d);
  assert.equal(d.v, 1);
  assert.equal(d.step, 2);
  assert.equal(d.claims.length, 2);
  assert.equal(d.claims[1].link, "https://example.com");
  assert.equal(d.passedChecks.problem_framing, true);
});

test("깨진 입력은 전부 null — 빈 값·비JSON·버전 불일치", () => {
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft(""), null);
  assert.equal(parseDraft("{not json"), null);
  assert.equal(parseDraft(JSON.stringify({ ...JSON.parse(serializeDraft(base(), "t")), v: 2 })), null);
});

test("범위·타입 위반은 null — step·experience 상한·claims 상태·checks·source", () => {
  const ok = JSON.parse(serializeDraft(base(), "t"));
  assert.equal(parseDraft(JSON.stringify({ ...ok, step: 5 })), null);
  assert.equal(parseDraft(JSON.stringify({ ...ok, step: 1.5 })), null);
  assert.equal(parseDraft(JSON.stringify({ ...ok, experience: "가".repeat(DRAFT_MAX_EXPERIENCE + 1) })), null);
  assert.equal(parseDraft(JSON.stringify({ ...ok, claims: [{ ...claim(), status: "weird" }] })), null);
  assert.equal(parseDraft(JSON.stringify({ ...ok, claims: [{ ...claim(), confidence: "매우 높음" }] })), null);
  assert.equal(parseDraft(JSON.stringify({ ...ok, passedChecks: { a: "yes" } })), null);
  assert.equal(parseDraft(JSON.stringify({ ...ok, analysisSource: "loading" })), null);
  assert.equal(parseDraft(JSON.stringify({ ...ok, analysisModel: 3 })), null);
});

test("저장·복원·소거가 storage 계약을 지킨다", () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  };
  saveDraft(storage, base(), "2026-07-25T00:00:00.000Z");
  assert.ok(mem.has(DRAFT_KEY));
  const restored = loadDraft(storage);
  assert.ok(restored);
  assert.equal(restored.experience, base().experience);
  clearDraft(storage);
  assert.equal(loadDraft(storage), null);
});

test("접근 불가 storage에서도 예외 없이 동작한다(프라이빗 모드)", () => {
  const throwing = {
    getItem: () => { throw new Error("denied"); },
    setItem: () => { throw new Error("denied"); },
    removeItem: () => { throw new Error("denied"); },
  };
  assert.equal(loadDraft(throwing), null);
  assert.doesNotThrow(() => saveDraft(throwing, base(), "t"));
  assert.doesNotThrow(() => clearDraft(throwing));
});
