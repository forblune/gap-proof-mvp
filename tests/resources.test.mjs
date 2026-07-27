// Learn Before Check Phase 1 — "먼저 알아보기" 검색 링크 순수 함수 단위 테스트.
// 실제 네트워크 호출 없음(URL 구성 로직만 검증).
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLearnResources,
  buildInstitutionalResources,
  buildProjectCard,
  buildLookIntoItResources,
  WORK24_TRAINING_URL,
  YOUTH_CENTER_SEARCH_URL,
} from "../app/lib/resources.ts";

const KEYWORD = "데이터 수집·정제";
const HYPOTHESIS = "데이터 분석가 (가설)";
const PROJECT = { title: "공개 데이터 1개 정제 노트", time: "2시간", rule: "전처리 단계·결과 표 기록" };

test("YouTube 검색 링크는 https이고 검색어를 인코딩해 포함한다(원문 아님)", () => {
  const [youtube] = buildLearnResources(KEYWORD, HYPOTHESIS);
  assert.equal(youtube.id, "youtube");
  assert.ok(youtube.href.startsWith("https://www.youtube.com/results?search_query="));
  const url = new URL(youtube.href);
  assert.equal(url.searchParams.get("search_query"), KEYWORD);
});

test("K-MOOC 검색 링크는 실제 확인된 /view/search/<검색어> 경로 패턴을 쓴다", () => {
  const [, kmooc] = buildLearnResources(KEYWORD, HYPOTHESIS);
  assert.equal(kmooc.id, "kmooc");
  assert.equal(kmooc.href, `https://www.kmooc.kr/view/search/${encodeURIComponent(KEYWORD)}`);
  assert.ok(kmooc.href.startsWith("https://"));
});

test("고용24·온통청년은 GET 검색 딥링크가 없으므로 공식 진입 페이지 고정 URL만 쓰고, 검색어는 searchHint 문구로만 안내한다", () => {
  const [work24, youthcenter] = buildInstitutionalResources(KEYWORD, HYPOTHESIS);
  assert.equal(work24.href, WORK24_TRAINING_URL);
  assert.equal(youthcenter.href, YOUTH_CENTER_SEARCH_URL);
  assert.ok(work24.href.startsWith("https://"));
  assert.ok(youthcenter.href.startsWith("https://"));
  assert.ok(work24.searchHint.includes(KEYWORD));
  assert.ok(youthcenter.searchHint.includes(KEYWORD));
  // href 자체에는 검색어가 쿼리 파라미터로 조합되어 있지 않아야 한다(미검증 URL 파라미터를 지어내지 않음)
  assert.ok(!work24.href.includes(encodeURIComponent(KEYWORD)));
  assert.ok(!youthcenter.href.includes(encodeURIComponent(KEYWORD)));
});

test("모든 카드는 새 창 안내를 포함한 고유 aria-label과 비어있지 않은 linkLabel을 가진다", () => {
  const cards = [...buildLearnResources(KEYWORD, HYPOTHESIS), ...buildInstitutionalResources(KEYWORD, HYPOTHESIS)];
  const ariaLabels = new Set();
  for (const card of cards) {
    assert.ok(card.ariaLabel.includes("새 창에서 열림"), `${card.id} aria-label에 새 창 안내가 없습니다`);
    assert.ok(card.linkLabel.trim().length > 0);
    assert.ok(!ariaLabels.has(card.ariaLabel), `${card.id} aria-label이 다른 카드와 중복됩니다`);
    ariaLabels.add(card.ariaLabel);
  }
});

test("시간·난이도·무료 여부 배지는 전부 (예상) 또는 예상 문구를 포함해 특정 콘텐츠 존재를 단정하지 않는다", () => {
  const cards = [...buildLearnResources(KEYWORD, HYPOTHESIS), ...buildInstitutionalResources(KEYWORD, HYPOTHESIS)];
  for (const card of cards) {
    assert.ok(/예상/.test(card.time), `${card.id} time에 예상 표기 없음: ${card.time}`);
    assert.ok(/예상/.test(card.difficulty), `${card.id} difficulty에 예상 표기 없음: ${card.difficulty}`);
    assert.ok(/예상/.test(card.free), `${card.id} free에 예상 표기 없음: ${card.free}`);
    assert.ok(card.hypothesis.includes(HYPOTHESIS));
    assert.ok(card.verify.trim().length > 0);
  }
});

test("프로젝트 카드는 엔진의 기존 ActionTemplate 값을 그대로 사용한다(새 콘텐츠 생성 없음)", () => {
  const project = buildProjectCard(PROJECT, HYPOTHESIS);
  assert.equal(project.title, PROJECT.title);
  assert.equal(project.time, PROJECT.time);
  assert.equal(project.rule, PROJECT.rule);
  assert.ok(project.hypothesis.includes(HYPOTHESIS));
});

test("buildLookIntoItResources는 learn 2개 · institutional 2개 · project 1개를 합성한다", () => {
  const result = buildLookIntoItResources(KEYWORD, HYPOTHESIS, PROJECT);
  assert.equal(result.learn.length, 2);
  assert.equal(result.institutional.length, 2);
  assert.equal(result.project.title, PROJECT.title);
});

// PR #76 리뷰 수정 — AI 직업 가설이 없을 때(hypothesis=null) 사용자가 선택한 목표직무명을
// "AI 가설"인 것처럼 대신 채워 넣지 않는다. 배지 자체를 만들지 않아야 한다(지어내지 않음).
test("hypothesis가 null이면 카드에 AI 가설 배지를 만들지 않는다(직무명을 대신 채우지 않음)", () => {
  const cards = [...buildLearnResources(KEYWORD, null), ...buildInstitutionalResources(KEYWORD, null)];
  for (const card of cards) {
    assert.equal(card.hypothesis, null, `${card.id}는 hypothesis가 null이어야 합니다`);
  }
  const project = buildProjectCard(PROJECT, null);
  assert.ok(!project.hypothesis.includes("AI 가설"), "hypothesis가 없으면 프로젝트 카드에 AI 가설 문구가 없어야 합니다");
  assert.ok(project.hypothesis.includes("검색 없이 지금 바로 시작할 수 있습니다"));
});

test("hypothesis가 있으면 배지 문구가 판정이 아님을 명시한다", () => {
  const [youtube] = buildLearnResources(KEYWORD, HYPOTHESIS);
  assert.equal(youtube.hypothesis, `AI 가설: ${HYPOTHESIS} (판정 아님)`);
});
