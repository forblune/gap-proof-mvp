// 인정 체계 규칙 검증 — 문서(기획서)·코드·UI가 같은 규칙을 쓰는지 확인한다.
// 핵심: 퀴즈(이해 확인)만으로는 수행 인정도, 수행 확인서도, 증거등급 상승도 얻을 수 없다.
import test from "node:test";
import assert from "node:assert/strict";
import {
  RECOGNITION_KINDS,
  TIER_RULES,
  CERTIFICATE_KINDS,
  CERTIFICATE_ISSUER,
  CERTIFICATE_DISCLAIMER,
  findRecognitionKind,
  isValidArtifactUrl,
  validArtifacts,
  canIssueLearningCertificate,
  CERTIFICATE_USAGE_NOTE,
  RECOGNITION_GROUPS,
  recognitionGroupOf,
  certificateScope,
  isAnsweredEnough,
  countAnswered,
  MIN_ANSWER_CHARS,
  canIssuePerformanceCertificate,
  recognitionKindsFor,
  maxTierFromRecord,
  certificateSerial,
  evidenceCoverage,
  COVERAGE_DISCLAIMER,
} from "../app/lib/recognition.ts";

const baseRecord = (over = {}) => ({
  competencyId: "problem_framing",
  competencyLabel: "문제 정의·도메인 연결",
  sourceTitle: "사용자 문제정의 기초",
  sourceUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  requiredQuestionCount: 3,
  answeredQuestionCount: 3,
  sourceCompleted: true,
  understandingChecked: false,
  performanceNote: "",
  artifacts: [],
  ...over,
});

test("인정 유형 6종이 모두 한계(limits)를 명시한다 — 한계 없는 인정은 과장이다", () => {
  assert.equal(RECOGNITION_KINDS.length, 6);
  for (const kind of RECOGNITION_KINDS) {
    assert.ok(kind.means.trim().length > 0, `${kind.id} means 누락`);
    assert.ok(kind.limits.trim().length > 0, `${kind.id} limits 누락`);
  }
});

test("학습 완료·이해 확인은 단독으로 증거등급을 올리지 못한다(maxTier 0)", () => {
  assert.equal(findRecognitionKind("learning_completed").maxTier, 0);
  assert.equal(findRecognitionKind("understanding_checked").maxTier, 0);
});

test("증거등급 규칙표가 Lv.2 금지 조건에 '퀴즈 통과만으로는 오르지 않음'을 명시한다", () => {
  const lv2 = TIER_RULES.find((rule) => rule.tier === 2);
  assert.ok(lv2, "Lv.2 규칙 누락");
  assert.match(lv2.neverWhen, /이해 확인|퀴즈/);
  assert.match(lv2.neverWhen, /0개|않습니다/);
});

test("발급 문서 3종이 서로 다른 조건과 '뜻하지 않는 것'을 가진다", () => {
  assert.equal(CERTIFICATE_KINDS.length, 3);
  const ids = CERTIFICATE_KINDS.map((kind) => kind.id);
  assert.deepEqual(ids, ["learning", "performance", "external_record"]);
  for (const kind of CERTIFICATE_KINDS) {
    assert.ok(kind.requires.trim().length > 0);
    assert.ok(kind.doesNotMean.trim().length > 0);
  }
  // 수료증과 수행 확인서의 조건이 실제로 달라야 한다
  const learning = CERTIFICATE_KINDS.find((k) => k.id === "learning");
  const performance = CERTIFICATE_KINDS.find((k) => k.id === "performance");
  assert.notEqual(learning.requires, performance.requires);
  assert.match(performance.requires, /산출물/);
});

test("발급 고지에 발급 주체와 '공인 자격 아님'이 포함된다", () => {
  assert.match(CERTIFICATE_ISSUER, /Forblune/);
  assert.match(CERTIFICATE_ISSUER, /GapProof/);
  assert.match(CERTIFICATE_DISCLAIMER, /공인 자격/);
});

test("산출물 링크는 http/https만 유효하다", () => {
  assert.equal(isValidArtifactUrl("https://github.com/me/repo"), true);
  assert.equal(isValidArtifactUrl("http://example.com/doc"), true);
  assert.equal(isValidArtifactUrl(""), false);
  assert.equal(isValidArtifactUrl("   "), false);
  assert.equal(isValidArtifactUrl("내가 만든 문서"), false);
  assert.equal(isValidArtifactUrl("/local/path"), false);
  assert.equal(isValidArtifactUrl("javascript:alert(1)"), false);
  assert.equal(isValidArtifactUrl("ftp://files.example.com/a"), false);
});

test("학습 수료증: 필수 질문에 전부 답해야 발급된다", () => {
  const done = canIssueLearningCertificate(baseRecord());
  assert.equal(done.eligible, true);
  assert.deepEqual(done.missing, []);

  const partial = canIssueLearningCertificate(baseRecord({ answeredQuestionCount: 1 }));
  assert.equal(partial.eligible, false);
  assert.ok(partial.missing.length > 0);
  assert.ok(partial.nextStep, "다음 행동 안내가 있어야 한다");
});

test("학습 수료증은 이해 확인(퀴즈) 통과를 요구하지 않는다 — '봤다'는 사실만 말한다", () => {
  const decision = canIssueLearningCertificate(baseRecord({ understandingChecked: false }));
  assert.equal(decision.eligible, true);
});

test("수행 확인서: 퀴즈만 통과해서는 절대 발급되지 않는다", () => {
  const quizOnly = canIssuePerformanceCertificate(
    baseRecord({ understandingChecked: true, performanceNote: "", artifacts: [] }),
  );
  assert.equal(quizOnly.eligible, false);
  assert.ok(quizOnly.missing.some((m) => /결과물|산출물/.test(m)));
  assert.ok(quizOnly.nextStep);
});

test("수행 확인서: 산출물 링크만 있고 수행 기록이 없으면 발급되지 않는다", () => {
  const decision = canIssuePerformanceCertificate(
    baseRecord({ artifacts: [{ url: "https://github.com/me/repo" }], performanceNote: "" }),
  );
  assert.equal(decision.eligible, false);
  assert.ok(decision.missing.some((m) => /한 줄 기록/.test(m)));
});

test("수행 확인서: 수행 기록만 있고 유효한 링크가 없으면 발급되지 않는다", () => {
  const decision = canIssuePerformanceCertificate(
    baseRecord({ performanceNote: "인터뷰 5명 진행", artifacts: [{ url: "메모장에 정리함" }] }),
  );
  assert.equal(decision.eligible, false);
  assert.ok(decision.missing.some((m) => /결과물 링크/.test(m)));
});

test("수행 확인서: 학습 수료 + 산출물 + 수행 기록이 모두 있으면 발급된다", () => {
  const decision = canIssuePerformanceCertificate(
    baseRecord({
      performanceNote: "실제 문제 1개를 5문장으로 정의해 봤다",
      artifacts: [{ url: "https://github.com/me/notes", note: "정의 문서" }],
    }),
  );
  assert.equal(decision.eligible, true);
  assert.deepEqual(decision.missing, []);
  assert.equal(decision.nextStep, null);
});

test("수행 확인서: 필수 질문이 남아 있으면 산출물이 있어도 발급되지 않는다", () => {
  const decision = canIssuePerformanceCertificate(
    baseRecord({
      answeredQuestionCount: 0,
      performanceNote: "해봤다",
      artifacts: [{ url: "https://github.com/me/notes" }],
    }),
  );
  assert.equal(decision.eligible, false);
});

test("영상 학습 + 퀴즈만으로 도달하는 최대 증거등급은 0이다", () => {
  const record = baseRecord({ understandingChecked: true });
  const kinds = recognitionKindsFor(record);
  assert.ok(kinds.includes("learning_completed"));
  assert.ok(kinds.includes("understanding_checked"));
  assert.ok(!kinds.includes("performance_done"));
  assert.ok(!kinds.includes("artifact_linked"));
  assert.equal(maxTierFromRecord(record), 0);
});

test("산출물이 연결되고 그 역량에 확인 증거가 있을 때만 최대 증거등급이 2까지 올라간다", () => {
  const record = baseRecord({
    understandingChecked: true,
    performanceNote: "직접 만들어 봤다",
    artifacts: [{ url: "https://github.com/me/repo" }],
  });
  // 기획서 §6.2의 Lv.2 전제("그 역량에 확인된 근거가 이미 있고")를 코드가 지킨다.
  assert.equal(maxTierFromRecord(record, false), 1, "확인 증거 없이 Lv.2에 도달함");
  assert.equal(maxTierFromRecord(record, true), 2);
});

test("유효하지 않은 링크는 산출물로 세지 않는다", () => {
  const record = baseRecord({ artifacts: [{ url: "not a url" }, { url: "https://ok.example.com" }] });
  assert.equal(validArtifacts(record).length, 1);
});

test("고유번호는 문서 유형별로 다르고, 같은 입력이면 같은 값이다(재발행 안정)", () => {
  const record = baseRecord();
  const a = certificateSerial("learning", record, "2026-07-28", "user-1");
  const b = certificateSerial("learning", record, "2026-07-28", "user-1");
  const c = certificateSerial("performance", record, "2026-07-28", "user-1");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^GP-L-\d{8}-[0-9A-Z]{6}$/);
  assert.match(c, /^GP-P-\d{8}-[0-9A-Z]{6}$/);
});

// ── 증거 충족도: 취업 가능성 예측이 아님을 구조적으로 보장 ──────────────────
test("증거 충족도는 요구 증거 대비 확인 항목 비율이며 산정식과 근거를 공개한다", () => {
  const coverage = evidenceCoverage(["문제 정의 문서", "인터뷰 기록", "작동 링크"], ["문제 정의 문서"]);
  assert.equal(coverage.requiredCount, 3);
  assert.equal(coverage.metCount, 1);
  assert.equal(coverage.percent, 33);
  assert.deepEqual(coverage.basis, ["문제 정의 문서"]);
  assert.deepEqual(coverage.unmet, ["인터뷰 기록", "작동 링크"]);
  assert.match(coverage.formula, /÷/);
  assert.match(coverage.formula, /1개/);
  assert.match(coverage.formula, /3개/);
});

test("증거 충족도 고지는 채용·합격·적성을 뜻하지 않는다고 명시한다", () => {
  const coverage = evidenceCoverage(["a"], []);
  assert.match(coverage.disclaimer, /채용 가능성/);
  assert.match(coverage.disclaimer, /합격 가능성/);
  assert.match(coverage.disclaimer, /적성/);
  assert.match(COVERAGE_DISCLAIMER, /뜻하지 않습니다/);
});

test("요구 증거가 없으면 0%를 반환하고 0으로 나누지 않는다", () => {
  const coverage = evidenceCoverage([], []);
  assert.equal(coverage.percent, 0);
  assert.equal(Number.isFinite(coverage.percent), true);
});

test("전부 충족하면 100%이고 미충족 목록이 비어 있다", () => {
  const coverage = evidenceCoverage(["a", "b"], ["a", "b"]);
  assert.equal(coverage.percent, 100);
  assert.deepEqual(coverage.unmet, []);
});

test("요구 목록에 없는 항목은 충족으로 세지 않는다(임의 가산 금지)", () => {
  const coverage = evidenceCoverage(["a"], ["a", "관계없는 항목", "b"]);
  assert.equal(coverage.metCount, 1);
  assert.equal(coverage.percent, 100);
});

test("고유번호는 발급 대상이 다르면 달라진다 — 같은 날 같은 학습이어도 사람이 다르면 번호가 다르다", () => {
  const record = baseRecord();
  const userA = certificateSerial("learning", record, "2026-07-28", "user-A");
  const userB = certificateSerial("learning", record, "2026-07-28", "user-B");
  assert.notEqual(userA, userB, "서로 다른 사용자가 같은 번호를 받으면 '고유번호'가 거짓이 된다");
});

// ── 문서·recognition.ts·engine.ts 3자 교차 검증 ─────────────────────────────
// 심사 지적(D3): 기획서는 "둘이 어긋나면 이 테스트가 실패한다"고 적었지만 실제로는
// engine.ts를 한 번도 부르지 않아 아무것도 강제하지 못했다. 아래가 그 강제를 만든다.
import { competencyStrength, hasConfirmedEvidenceFor } from "../app/lib/engine.ts";

const engineComp = {
  id: "problem_framing",
  label: "문제 정의",
  required: 3,
  importance: 2,
  proof: "문제 정의 문서",
  keywords: ["정의", "문제"],
  learn: { title: "l", time: "t", rule: "r" },
  project: { title: "p", time: "t", rule: "r" },
};
const matching = (tier = 0) => ({ skill: "문제 정의", quote: "문제를 정의해 봤다", tier });

test("engine 교차검증: TIER_RULES의 Lv.2 금지 조건이 competencyStrength에서 실제로 지켜진다", () => {
  // 규칙표가 "이해 확인만으로는 오르지 않는다"고 적었으므로, 엔진도 그래야 한다.
  const lv2 = TIER_RULES.find((r) => r.tier === 2);
  assert.match(lv2.neverWhen, /이해 확인|퀴즈/);
  // 매칭 증거 없이 퀴즈만 통과 → 3에 도달하면 안 된다.
  assert.notEqual(competencyStrength(engineComp, [], { [engineComp.id]: true }), 3);
});

test("engine 교차검증: 인정 유형의 maxTier 0이 엔진 동작과 일치한다", () => {
  // learning_completed / understanding_checked 는 단독 maxTier 0이라고 문서·코드가 선언한다.
  assert.equal(findRecognitionKind("learning_completed").maxTier, 0);
  assert.equal(findRecognitionKind("understanding_checked").maxTier, 0);
  // 따라서 확인 증거가 하나도 없으면 엔진 강도도 0이어야 한다.
  assert.equal(competencyStrength(engineComp, [], { [engineComp.id]: true }), 0);
});

test("engine 교차검증: hasConfirmedEvidenceFor 가 두 모듈에서 같은 전제로 쓰인다", () => {
  assert.equal(hasConfirmedEvidenceFor(engineComp, []), false);
  assert.equal(hasConfirmedEvidenceFor(engineComp, [matching()]), true);
  // 매칭 증거가 있을 때만 퀴즈가 등급에 반영된다.
  assert.equal(competencyStrength(engineComp, [matching()], { [engineComp.id]: true }), 3);
  assert.equal(competencyStrength(engineComp, [matching()], {}), 1);
});

// ── 심사 지적 반영: 링크 판정과 최대 등급 전제 ──────────────────────────────
import { tierFromLink, isVerifiableLink } from "../app/lib/engine.ts";

test("engine 교차검증: 링크 판정 기준이 산출물 판정 기준과 같다", () => {
  // 기획서 §6.2 Lv.1 금지 조건("링크 없이 설명만 덧붙이기")을 두 함수가 같은 기준으로 지켜야 한다.
  for (const input of ["설명만 적음", "메모장에 정리함", "", "   ", "/local/path", "javascript:alert(1)", "ftp://x/y"]) {
    assert.equal(isVerifiableLink(input), false, `${input} 를 링크로 인정함`);
    assert.equal(isValidArtifactUrl(input), false, `${input} 를 산출물로 인정함`);
    assert.equal(tierFromLink(input), 0, `${input} 로 등급이 올라감`);
  }
  for (const input of ["https://github.com/me/repo", "http://example.com/a"]) {
    assert.equal(isVerifiableLink(input), true);
    assert.equal(isValidArtifactUrl(input), true);
    assert.equal(tierFromLink(input), 1);
  }
});

test("설명 문장을 근거 링크 칸에 적어도 증거등급이 오르지 않는다", () => {
  const comp = {
    id: "problem_framing", label: "문제 정의", required: 3, importance: 2,
    proof: "문제 정의 문서", keywords: ["정의"],
    learn: { title: "l", time: "t", rule: "r" }, project: { title: "p", time: "t", rule: "r" },
  };
  const claim = { skill: "문제 정의", quote: "문제를 정의했다", tier: tierFromLink("메모장에 정리함") };
  assert.equal(claim.tier, 0);
  assert.equal(competencyStrength(comp, [claim], {}), 1); // tier 0 + 1
});

test("확인 증거가 없으면 학습 기록만으로 Lv.2에 도달하지 않는다", () => {
  const record = baseRecord({
    understandingChecked: true,
    performanceNote: "직접 해 봤다",
    artifacts: [{ url: "https://github.com/me/repo" }],
  });
  // 이 역량에 확인된 근거가 없는 경우 — 기획서 §6.2의 Lv.2 전제 미충족
  assert.equal(maxTierFromRecord(record, false), 1);
  // 확인된 근거가 있으면 그때 Lv.2까지 열린다
  assert.equal(maxTierFromRecord(record, true), 2);
});

// 심사 지적: 증서가 "학습 자료 완료"를 인쇄하는데 시스템은 그것을 전혀 확인하지 않았다.
// 확인하지 않은 사실을 인쇄하지 않도록, 조건과 문구를 같은 모듈에서 묶어 검증한다.
test("자료 완료를 표시하지 않으면 학습 수료증이 발급되지 않는다", () => {
  const decision = canIssueLearningCertificate(baseRecord({ sourceCompleted: false }));
  assert.equal(decision.eligible, false);
  assert.ok(decision.missing.some((m) => m.includes("끝까지")), decision.missing.join(" / "));
  assert.ok(decision.nextStep && decision.nextStep.includes("완료"));
});

test("자료 완료 미표시는 수행 확인서도 막는다 — 상위 문서가 하위 조건을 건너뛰지 않는다", () => {
  const decision = canIssuePerformanceCertificate(
    baseRecord({
      sourceCompleted: false,
      performanceNote: "실제 문제 1개를 5문장으로 정의했습니다",
      artifacts: [{ url: "https://github.com/me/repo" }],
    }),
  );
  assert.equal(decision.eligible, false);
});

test("증서에 인쇄되는 확인 범위는 실제로 검사하는 조건만 담는다", () => {
  const learning = certificateScope("learning");
  const performance = certificateScope("performance");
  // 시청 시간을 측정하지 않으므로 "본인이 표시한"이 빠지면 확인하지 않은 사실을 단정하게 된다.
  assert.ok(learning.includes("본인이 표시한"), learning);
  assert.ok(learning.includes("필수 질문"), learning);
  assert.ok(performance.includes("산출물"), performance);
  // 퀴즈(이해 확인)는 두 증서의 조건이 아니므로 범위에 적히면 안 된다.
  assert.ok(!learning.includes("이해 확인"));
  assert.ok(!performance.includes("이해 확인"));
});

test("한 글자 답은 응답으로 세지 않는다 — 형식만 채운 응답으로 증서가 나오지 않는다", () => {
  assert.equal(isAnsweredEnough("네"), false);
  assert.equal(isAnsweredEnough("   "), false);
  assert.equal(isAnsweredEnough("가".repeat(MIN_ANSWER_CHARS)), true);
  assert.equal(countAnswered(["네", "가".repeat(MIN_ANSWER_CHARS), null, undefined]), 1);

  const record = baseRecord({ requiredQuestionCount: 3, answeredQuestionCount: countAnswered(["네", "응", "ㅇ"]) });
  const decision = canIssueLearningCertificate(record);
  assert.equal(decision.eligible, false);
  assert.ok(decision.missing.some((m) => m.includes(String(MIN_ANSWER_CHARS))), decision.missing.join(" / "));
});

// 벤치마킹(Forage) 적용 — 문서가 어디에 적으면 안 되는지까지 말한다.
// "공인 자격이 아니다"라는 고지만으로는 경력란에 적히는 것을 막지 못한다.
test("발급 문서가 적어야 할 자리와 적으면 안 되는 자리를 함께 말한다", () => {
  assert.ok(CERTIFICATE_USAGE_NOTE.allowed.includes("수료") || CERTIFICATE_USAGE_NOTE.allowed.includes("자격"));
  assert.ok(CERTIFICATE_USAGE_NOTE.forbidden.includes("경력"));
  assert.ok(CERTIFICATE_USAGE_NOTE.forbidden.includes("고용") || CERTIFICATE_USAGE_NOTE.forbidden.includes("근무"));
  // 고용을 뜻한다고 읽힐 표현이 들어가면 안 된다.
  for (const value of Object.values(CERTIFICATE_USAGE_NOTE)) {
    assert.equal(/취업|합격|채용 가능/.test(value), false, value);
  }
});

test("발급 조건 설명이 실제 판정 함수와 같은 것을 말한다", () => {
  const learning = CERTIFICATE_KINDS.find((kind) => kind.id === "learning");
  assert.ok(learning.requires.includes("본인이 표시한"), learning.requires);
  assert.ok(learning.requires.includes(String(MIN_ANSWER_CHARS)), learning.requires);
});

// 벤치마킹(Credly·Europass) 적용 — 신뢰 등급을 라벨이 아니라 구조로 구분한다.
test("모든 인정 유형이 정확히 하나의 그룹에 속한다 — 어디에도 없는 유형은 화면으로 샌다", () => {
  for (const kind of RECOGNITION_KINDS) {
    const groups = RECOGNITION_GROUPS.filter((group) => group.kinds.includes(kind.id));
    assert.equal(groups.length, 1, `${kind.id} 가 ${groups.length}개 그룹에 속합니다`);
    assert.equal(recognitionGroupOf(kind.id), groups[0].id);
  }
});

test("자기기록과 외부 발급이 같은 그룹에 들어가지 않는다", () => {
  const self = RECOGNITION_GROUPS.find((group) => group.id === "self");
  const external = RECOGNITION_GROUPS.find((group) => group.id === "external");
  assert.ok(self.kinds.includes("learning_completed"));
  assert.ok(self.kinds.includes("understanding_checked"));
  assert.ok(external.kinds.includes("external_credential"));
  // 겹치면 구조로 구분한다는 전제가 무너진다.
  assert.deepEqual(self.kinds.filter((id) => external.kinds.includes(id)), []);
  // 각 그룹은 "누가 확인했는지"를 반드시 밝힌다.
  for (const group of RECOGNITION_GROUPS) {
    assert.ok(group.who.trim().length > 0, group.id);
  }
  // 외부 그룹은 GapProof가 진위를 확인하지 않았음을 명시한다.
  assert.match(external.who, /발급기관|GapProof가 아닙니다/);
});
