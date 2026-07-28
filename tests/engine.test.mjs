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

test("confirmed evidence 1(매칭) + quiz pass → Lv.3 가능", () => {
  const strength = competencyStrength(comp, [matchingClaim()], { [comp.id]: true });
  assert.equal(strength, 3);
});

test("confirmed evidence 1(매칭) + quiz fail → Lv.3 아님(기존 tier+1 로직만 적용)", () => {
  const strength = competencyStrength(comp, [matchingClaim(0)], { [comp.id]: false });
  assert.equal(strength, 1); // tier 0(자기기록) + 1
  assert.notEqual(strength, 3);
});

test("확인 증거 제거 후 다시 0 → Lv.3 해제", () => {
  const withEvidence = competencyStrength(comp, [matchingClaim()], { [comp.id]: true });
  assert.equal(withEvidence, 3);
  const withoutEvidence = competencyStrength(comp, [], { [comp.id]: true });
  assert.notEqual(withoutEvidence, 3);
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
