// 증거등급 무결성 P0: 학습확인(퀴즈) 통과만으로 Lv.3 "수행 확인"이 되지 않도록 하는 규칙 검증.
// 확인된 증거(원문 인용)와 매칭되지 않는 퀴즈 통과는 등급에 반영되지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import { competencyStrength, tierFromLink } from "../app/lib/engine.ts";

const comp = {
  id: "data-cleaning",
  label: "데이터 정리",
  required: 3,
  importance: 2,
  proof: "정리 기준을 설명할 수 있음",
  keywords: ["정리", "데이터"],
  learn: { title: "학습", time: "1시간", rule: "규칙" },
  project: { title: "프로젝트", time: "1시간", rule: "규칙" },
};

const matchingClaim = (tier = 0) => ({ skill: "데이터 정리", quote: "재고 데이터를 표로 정리했다", tier });
const nonMatchingClaim = (tier = 0) => ({ skill: "발표", quote: "발표 자료를 만들었다", tier });

test("confirmed evidence 0 + quiz fail → Lv.3 아님", () => {
  const strength = competencyStrength(comp, [], { [comp.id]: false });
  assert.notEqual(strength, 3);
  assert.equal(strength, 0);
});

test("confirmed evidence 0 + quiz pass → Lv.3 아님(퀴즈만으로 증거를 만들지 않는다)", () => {
  const strength = competencyStrength(comp, [], { [comp.id]: true });
  assert.notEqual(strength, 3);
  assert.equal(strength, 0);
});

test("이 역량과 매칭되지 않는 확인 증거 + quiz pass → Lv.3 아님", () => {
  const strength = competencyStrength(comp, [nonMatchingClaim()], { [comp.id]: true });
  assert.notEqual(strength, 3);
});

// 이 테스트는 원래 "퀴즈 통과 + 확인 증거 1개 → 강도 3"을 기대값으로 못박고 있었다.
// 그런데 STEP2→3 게이트가 확인 증거 1개 이상을 이미 강제하므로, 퀴즈 화면에 도달한 모든
// 사용자가 그 전제를 자동 충족한다 — 실질적으로 "퀴즈만 통과하면 수행 확인"이었다.
// 이 제품이 가장 강하게 금지한 경로이므로 기대값을 반대로 뒤집는다.
test("퀴즈 통과는 확인 증거가 있어도 강도를 올리지 않는다", () => {
  const withQuiz = competencyStrength(comp, [matchingClaim()], { [comp.id]: true });
  const withoutQuiz = competencyStrength(comp, [matchingClaim()], {});
  assert.equal(withQuiz, withoutQuiz, "퀴즈 통과가 강도를 바꿨습니다");
  assert.notEqual(withQuiz, 3);
});

test("부정문이 키워드에 걸려도 퀴즈로 격차가 닫히지 않는다", () => {
  // 재현 입력: "API도 못 다루고 개발도 해본 적이 전혀 없다" 가 키워드 API 에 걸린다.
  const negation = { skill: "없음", quote: "API도 못 다루고 개발도 해본 적이 전혀 없다", tier: 0 };
  const strength = competencyStrength(comp, [negation], { [comp.id]: true });
  assert.ok(strength < comp.required, `강도 ${strength} 가 요구 ${comp.required} 를 채웠습니다`);
});

test("confirmed evidence 1(매칭) + quiz fail → Lv.3 아님(기존 tier+1 로직만 적용)", () => {
  const strength = competencyStrength(comp, [matchingClaim(0)], { [comp.id]: false });
  assert.equal(strength, 1); // tier 0(자기기록) + 1
  assert.notEqual(strength, 3);
});

test("확인 증거가 없으면 퀴즈를 통과해도 강도는 0이다", () => {
  const withoutEvidence = competencyStrength(comp, [], { [comp.id]: true });
  assert.equal(withoutEvidence, 0);
});

test("기존 정상 계산 회귀 없음 — 링크 있는 확인 증거(Lv.1)는 퀴즈 없이도 그대로 반영된다", () => {
  const strength = competencyStrength(comp, [matchingClaim(1)], {});
  assert.equal(strength, 2); // tier 1(근거 연결) + 1
});

test("기존 정상 계산 회귀 없음 — required 상한을 넘지 않는다", () => {
  const lowRequired = { ...comp, required: 1 };
  const strength = competencyStrength(lowRequired, [matchingClaim()], { [comp.id]: true });
  assert.equal(strength, 1);
});

test("기존 정상 계산 회귀 없음 — tierFromLink는 그대로 동작한다", () => {
  assert.equal(tierFromLink(undefined), 0);
  assert.equal(tierFromLink(""), 0);
  assert.equal(tierFromLink("https://example.com"), 1);
});
