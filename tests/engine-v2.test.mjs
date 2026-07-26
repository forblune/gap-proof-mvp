// Gate 4(#40): 발견 엔진 V2 검증 단위 테스트 — 13종 경험 fixture + 단정 금지·인용 정합 규칙.
// 실제 모델 호출 없음(mock 응답으로 sanitize 경로만 검증).
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeClaimsV2, quoteInSource } from "../app/lib/engine-v2.ts";

// 13종 경험 fixture(발췌형 — 각 유형의 대표 문장 포함)
const FIXTURES = {
  game: "밤마다 길드 레이드 일정을 짜고 신규 멤버에게 공략 문서를 만들어 줬어요.",
  sns: "빵 사진을 3년간 300개 올리면서 어떤 사진이 반응이 좋은지 기록했어요.",
  care: "할머니 병원 세 곳의 일정과 서류를 2년간 제가 관리했어요.",
  parenting: "아이 이유식 식단표를 매주 만들고 알레르기 반응을 기록했어요.",
  parttime: "카페 마감을 맡으면서 신입 교육용 노트를 만들었어요.",
  selfstudy: "유튜브로 영상 편집을 독학해서 열 개쯤 만들었어요.",
  leave: "휴학하는 동안 동네 서점에서 책 정리 알바를 했어요.",
  gap: "쉬는 동안 매일 아침 산책하고 일기를 썼어요.",
  failure: "공모전에 세 번 떨어졌지만 제출물은 끝까지 완성했어요.",
  dropped: "쇼핑몰을 만들다 중단했지만 상품 등록 흐름까지는 구현했어요.",
  community: "온라인 카페 운영진으로 신고 처리 규칙을 정리했어요.",
  business: "스마트스토어에서 6개월간 스티커를 팔며 재고 표를 만들었어요.",
  mixed: "카페 알바 3년에 취미로 빵 계정 운영했고 영상 편집도 독학했어요.",
};

const validClaim = (source, over = {}) => ({
  skill: "기록·정리 역량 후보",
  quote: source,
  factStatus: "부분 확인",
  context: "일상 경험",
  behaviors: ["기록을 남김"],
  signals: ["반복"],
  evidenceStrength: "보통",
  overclaimRisk: null,
  question: "기록 실물이 남아 있나요?",
  jobHypotheses: [{ title: "운영 보조", reason: "반복 기록·정리 행동", missing: "기록 실물" }],
  smallStep: "기록 하나를 한 장으로 정리하기",
  ...over,
});

test("13종 경험 fixture 전부에서 원문 인용 후보가 생존한다", () => {
  for (const [kind, source] of Object.entries(FIXTURES)) {
    const out = sanitizeClaimsV2({ claims: [validClaim(source)] }, source);
    assert.equal(out.length, 1, kind);
    assert.equal(out[0].quote, source, kind);
  }
});

test("원문에 없는 인용은 폐기된다(환각 방지)", () => {
  const source = FIXTURES.game;
  const out = sanitizeClaimsV2({ claims: [validClaim(source, { quote: "저는 대기업에서 5년간 마케팅을 총괄했습니다." })] }, source);
  assert.equal(out.length, 0);
});

test("공백 차이는 흡수하되 부분 변형은 거부한다", () => {
  const source = "매주  레이드 일정을\n짜는 게 일이었어요.";
  assert.ok(quoteInSource("매주 레이드 일정을 짜는 게 일이었어요.", source));
  assert.ok(!quoteInSource("매주 레이드 일정을 즐겁게 짜는 게 일이었어요.", source));
  assert.ok(!quoteInSource("일정", source)); // 5자 미만 조각 인용 금지
});

test("근거 없는 직업 단정을 차단한다 — reason/missing 없거나 판정 어휘면 가설 폐기", () => {
  const source = FIXTURES.sns;
  const noReason = sanitizeClaimsV2({ claims: [validClaim(source, { jobHypotheses: [{ title: "마케터", reason: "", missing: "" }] })] }, source);
  assert.equal(noReason[0].jobHypotheses.length, 0);
  const verdict = sanitizeClaimsV2({ claims: [validClaim(source, { jobHypotheses: [{ title: "마케팅 전문가 적합", reason: "SNS를 많이 함", missing: "지표" }] })] }, source);
  assert.equal(verdict[0].jobHypotheses.length, 0);
  const ok = sanitizeClaimsV2({ claims: [validClaim(source)] }, source);
  assert.equal(ok[0].jobHypotheses.length, 1);
});

test("열거형 밖 값은 과장 방지 방향의 기본값으로 강등된다", () => {
  const source = FIXTURES.care;
  const out = sanitizeClaimsV2({ claims: [validClaim(source, { factStatus: "완벽함", evidenceStrength: "최상", signals: ["반복", "천재성"] })] }, source);
  assert.equal(out[0].factStatus, "부분 확인");
  assert.equal(out[0].evidenceStrength, "약함");
  assert.deepEqual(out[0].signals, ["반복"]);
});

test("signals 중복은 제거된다(렌더 key 충돌 방지)", () => {
  const source = FIXTURES.game;
  const out = sanitizeClaimsV2({ claims: [validClaim(source, { signals: ["반복", "반복", "책임"] })] }, source);
  assert.deepEqual(out[0].signals, ["반복", "책임"]);
});

test("상한을 지킨다 — 후보 3·행동 3·가설 2", () => {
  const source = FIXTURES.mixed;
  const many = { claims: Array.from({ length: 6 }, (_, i) => validClaim(source, { skill: `후보 ${i}` })) };
  assert.equal(sanitizeClaimsV2(many, source).length, 3);
  const fat = sanitizeClaimsV2({ claims: [validClaim(source, {
    behaviors: ["a", "b", "c", "d", "e"],
    jobHypotheses: Array.from({ length: 4 }, (_, i) => ({ title: `가설${i}`, reason: "근거", missing: "증거" })),
  })] }, source);
  assert.equal(fat[0].behaviors.length, 3);
  assert.equal(fat[0].jobHypotheses.length, 2);
});

test("깨진 응답은 빈 배열 — 요청을 실패시키지 않는다", () => {
  for (const bad of [null, {}, { claims: "x" }, { claims: [null, 3, "y"] }]) {
    assert.deepEqual(sanitizeClaimsV2(bad, "아무 원문"), []);
  }
});
