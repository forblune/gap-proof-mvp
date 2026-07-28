// 증거등급 무결성 P0: 학습확인(퀴즈) 통과만으로 Lv.3 "수행 확인"이 되지 않도록 하는 규칙 검증.
// 확인된 증거(원문 인용)와 매칭되지 않는 퀴즈 통과는 등급에 반영되지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import { hasConfirmedEvidenceFor, keywordIsNegated, claimSupports, competencyStrength, tierFromLink } from "../app/lib/engine.ts";

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

// 심사 지적: 키워드 매칭만으로는 부정문도 증거가 된다.
// "개발도 해본 적이 전혀 없다" 가 키워드 API 에 걸려, 개발 경험이 없다고 적은 사용자에게
// 요구 증거가 충족됐다고 표시됐다. 링크(tier 1)를 붙이면 tier 필터로는 우회된다.
test("부정문은 링크를 붙여도 역량 근거로 세지 않는다", () => {
  const negation = { skill: "없음", quote: "데이터를 다뤄 본 적이 전혀 없다", tier: 0 };
  const negationWithLink = { ...negation, tier: 1 };
  assert.equal(hasConfirmedEvidenceFor(comp, [negation]), false);
  assert.equal(hasConfirmedEvidenceFor(comp, [negationWithLink]), false);
  assert.equal(competencyStrength(comp, [negationWithLink]), 0);
});

test("한 일과 못 한 일이 같은 문장에 있으면 한 일은 남긴다 — 과잉 차단 방지", () => {
  const mixed = { skill: "혼합", quote: "정리는 직접 해 봤지만 데이터는 다뤄 본 적 없다", tier: 1 };
  assert.equal(hasConfirmedEvidenceFor(comp, [mixed]), true);
  const reversed = { skill: "혼합", quote: "데이터는 모르지만 정리 기준은 직접 만들었습니다", tier: 1 };
  assert.equal(hasConfirmedEvidenceFor(comp, [reversed]), true);
});

test("부정 판정은 키워드가 든 절만 본다", () => {
  assert.equal(keywordIsNegated("데이터를 다뤄 본 적이 없습니다", "데이터"), true);
  assert.equal(keywordIsNegated("데이터로 표를 만들었습니다", "데이터"), false);
  assert.equal(keywordIsNegated("돈이 없다. 데이터로 표를 만들었습니다", "데이터"), false);
});

// 4라운드 심사 지적 — 부정 판정이 뚫리거나 반대로 실제 한 일을 지우던 경우들.
test("AI 라벨(skill)로 부정 판정을 우회할 수 없다 — 판정 대상은 사용자 원문뿐", () => {
  const bypass = {
    skill: "데이터 활용",
    quote: "항공물류 현장에서 일했습니다. 데이터는 한 번도 다뤄 본 적이 없습니다.",
    tier: 1,
  };
  assert.equal(hasConfirmedEvidenceFor(comp, [bypass]), false);
  assert.equal(competencyStrength(comp, [bypass]), 0);
});

test("경험 없음을 뜻하는 다른 표현도 증거로 세지 않는다", () => {
  for (const quote of ["데이터 경험 없음", "데이터 미경험", "데이터 경험은 전무합니다", "데이터는 제 분야가 아닙니다"]) {
    assert.equal(hasConfirmedEvidenceFor(comp, [{ skill: "x", quote, tier: 1 }]), false, quote);
  }
});

test("긍정문을 부정으로 잘못 지우지 않는다 — 사용자가 한 일을 없애는 쪽이 더 나쁘다", () => {
  for (const quote of [
    "데이터 연동을 직접 구현했고 장애가 한 번도 없었습니다",
    "데이터 정리를 계속했고 포기하지 않았습니다",
    "데이터 문서를 매일 정리하는 일을 멈추지 않았습니다",
  ]) {
    assert.equal(hasConfirmedEvidenceFor(comp, [{ skill: "x", quote, tier: 1 }]), true, quote);
  }
});

test("부정은 키워드 뒤 서술부에서만 찾는다 — 다른 명사에 붙은 부정을 가져오지 않는다", () => {
  assert.equal(keywordIsNegated("데이터를 다뤄 본 적이 없습니다", "데이터"), true);
  assert.equal(keywordIsNegated("예산이 없어서 데이터를 직접 정리했습니다", "데이터"), false);
});

test("배지 등급 계산과 게이트 판정이 같은 함수를 쓴다", () => {
  // 화면이 뒷받침하지 않는 근거에서 등급을 가져오지 않도록 두 곳이 같은 기준이어야 한다.
  const negationWithLink = { skill: "데이터 활용", quote: "데이터는 다뤄 본 적이 없습니다", tier: 1 };
  assert.equal(claimSupports(comp, negationWithLink), false);
  assert.equal(hasConfirmedEvidenceFor(comp, [negationWithLink]), false);
});

// 심사 지적: 부정 판정이 실제 한 일을 지우고 있었다.
// /전무/ 가 직함 "전무님" 에, /없음/ 이 "누락 없음" 에, /못 해/ 가 "잘못 해석" 에,
// /모르/ 가 "모르는 동료도" 에 걸렸다. 양방향 코퍼스로 고정한다.
const KEEP_CASES = [
  // 재현율을 올릴 때 가장 먼저 깨지는 문장들이다. 창을 넓히거나 "못 하", "모르" 를
  // 통째로 넣으면 아래가 다시 지워진다 — 증거를 놓치는 것보다 한 일을 지우는 쪽이 나쁘다.
  ["개발팀이 못 하던 자동화를 제가 만들었습니다", "개발"],
  ["데이터 누락이 없도록 검증 절차를 만들었습니다", "데이터"],
  ["항공물류 전무님께 보고할 운영 자료를 직접 만들었습니다", "물류"],
  ["데이터 누락 없음을 매일 확인했습니다", "데이터"],
  ["데이터를 잘못 해석해 다시 분석했습니다", "데이터"],
  ["데이터 구조를 모르는 동료도 쓸 수 있게 문서를 만들었습니다", "데이터"],
  ["API 연동을 직접 구현했고 장애가 한 번도 없었습니다", "API"],
  ["데이터 정리를 계속했고 포기하지 않았습니다", "데이터"],
  ["API 문서를 매일 정리하는 일을 멈추지 않았습니다", "API"],
];
const DROP_CASES = [
  // 6라운드 심사: 아래 6건이 전부 통과하고 있었다(검출률 9건 중 1건).
  ["저는 개발을 못합니다", "개발"],
  ["개발은 아무것도 모릅니다", "개발"],
  ["API는 잘 모릅니다", "API"],
  ["개발을 배운 적이 없어요", "개발"],
  ["개발은 제 담당이 아니었습니다", "개발"],
  ["개발 경험 제로", "개발"],
  ["개발 경험은 솔직히 말씀드리면 거의 전무한 수준입니다", "개발"],
  ["API도 못 다루고 개발도 해본 적이 전혀 없다", "API"],
  ["데이터를 다뤄 본 적이 전혀 없다", "데이터"],
  ["개발 경험 없음", "개발"],
  ["API 미경험", "API"],
  ["개발 경험은 전무합니다", "개발"],
  ["API를 사용해 본 일이 없습니다", "API"],
  ["개발은 전혀 해보지 않았습니다", "개발"],
  ["파이썬 코드를 짜 본 적이 없습니다", "코드"],
  ["개발 경험: 없습니다", "개발"],
  ["데이터는 제 분야가 아닙니다", "데이터"],
];

test("실제로 한 일을 부정으로 잘못 지우지 않는다", () => {
  for (const [quote, keyword] of KEEP_CASES) {
    assert.equal(keywordIsNegated(quote, keyword), false, `지워짐: ${quote}`);
  }
});

test("경험이 없다는 문장은 증거로 세지 않는다", () => {
  for (const [quote, keyword] of DROP_CASES) {
    assert.equal(keywordIsNegated(quote, keyword), true, `통과됨: ${quote}`);
  }
});

// 6라운드 심사 자동 FAIL: Solar 실연결 경로(sanitizeClaimsV2)에는 부정 판정이 없었다.
// route.ts 의 샘플 폴백만 걸러지고, 운영 트래픽이 지나는 정상 경로는 무필터였다.
test("인용문 전체가 부정 진술이면 역량 후보로 만들지 않는다", async () => {
  const { sanitizeClaimsV2 } = await import("../app/lib/engine-v2.ts");
  const source = "저는 개발을 해 본 적이 전혀 없습니다";
  const raw = {
    claims: [{
      skill: "개발 역량",
      quote: source,
      factStatus: "확인됨",
      evidenceStrength: "강함",
      question: "어떤 언어를 써 보셨습니까?",
    }],
  };
  assert.equal(sanitizeClaimsV2(raw, source).length, 0);
});

test("한 일과 못 한 일이 섞인 인용문은 폐기하지 않는다 — 과잉 차단 방지", async () => {
  const { sanitizeClaimsV2, quoteIsOnlyNegation } = await import("../app/lib/engine-v2.ts")
    .then(async (m) => ({ ...m, ...(await import("../app/lib/engine.ts")) }));
  const source = "항공물류 현장에서 3년 일했습니다. 개발은 해 본 적이 없습니다";
  assert.equal(quoteIsOnlyNegation(source), false);
  const raw = {
    claims: [{ skill: "현장 운영", quote: source, factStatus: "확인됨", evidenceStrength: "보통", question: "어떤 일을 하셨습니까?" }],
  };
  assert.equal(sanitizeClaimsV2(raw, source).length, 1);
});
