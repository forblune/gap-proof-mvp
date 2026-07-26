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

test("savedAt은 정보용 — 미래 시각·과거 시각 모두 복원한다(TTL 없음 = privacy v0.1의 '사용자 삭제 전까지'와 일치)", () => {
  const ok = JSON.parse(serializeDraft(base(), "2099-01-01T00:00:00.000Z"));
  assert.ok(parseDraft(JSON.stringify(ok))); // 미래 savedAt 수용(기기 시계 오차 허용)
  const old = JSON.parse(serializeDraft(base(), "2020-01-01T00:00:00.000Z"));
  assert.ok(parseDraft(JSON.stringify(old))); // 만료 개념 없음 — 명시적 삭제만
});

test("필수 필드 누락은 null — 부분 draft로 화면을 오염시키지 않는다", () => {
  const ok = JSON.parse(serializeDraft(base(), "t"));
  for (const key of ["step", "experience", "claims", "modelId", "savedAt"]) {
    const broken = { ...ok };
    delete broken[key];
    assert.equal(parseDraft(JSON.stringify(broken)), null, key);
  }
});

test("분석 상한(10,000자)을 넘겨 붙여넣은 입력도 draft로는 보존된다(소실 금지)", () => {
  const big = { ...base(), experience: "가".repeat(25_000) }; // 입력 상한 초과·draft 상한 이내
  const d = parseDraft(serializeDraft(big, "t"));
  assert.ok(d);
  assert.equal(d.experience.length, 25_000);
  assert.equal(parseDraft(serializeDraft({ ...base(), experience: "가".repeat(DRAFT_MAX_EXPERIENCE + 1) }, "t")), null); // 비정상 초과만 거부
});

test("손상된 V2 선택 필드는 draft 전체가 아니라 해당 필드만 제거된다(렌더 크래시 방지)", () => {
  const ok = JSON.parse(serializeDraft(base(), "t"));
  ok.claims[0].jobHypotheses = "corrupted-string";
  ok.claims[0].behaviors = [1, 2];
  ok.claims[0].factStatus = "이상한값";
  ok.claims[0].signals = ["반복", "초능력"];
  ok.claims[0].smallStep = "정상 문자열";
  const d = parseDraft(JSON.stringify(ok));
  assert.ok(d, "draft 자체는 복원되어야 한다");
  assert.equal(d.claims[0].jobHypotheses, undefined);
  assert.equal(d.claims[0].behaviors, undefined);
  assert.equal(d.claims[0].factStatus, undefined);
  assert.equal(d.claims[0].signals, undefined);
  assert.equal(d.claims[0].smallStep, "정상 문자열");
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
