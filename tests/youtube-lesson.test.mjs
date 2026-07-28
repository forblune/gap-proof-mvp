// YouTube URL 파싱 + Gemini 응답 검증 — 잘못된 URL·빈 응답·깨진 JSON을 화면에 통과시키지 않는다.
import test from "node:test";
import { LESSON_ONLY_MAX_TIER } from "../app/lib/recognition.ts";
import assert from "node:assert/strict";
import {
  parseYoutubeUrl,
  sanitizeLesson,
  LESSON_MAX_TIER,
  LESSON_QUESTION_KINDS,
} from "../app/lib/youtube-lesson.ts";

const VIDEO_ID = "dQw4w9WgXcQ";
const CANONICAL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

const validRaw = (over = {}) => ({
  title: "사용자 문제정의 기초",
  summary: "문제를 정의하는 방법을 설명한다. 사용자 관점에서 시작한다. 예시를 든다.",
  keyConcepts: ["문제 정의", "사용자 관점"],
  timestamps: [{ at: "1:20", label: "문제 정의란" }],
  questions: [
    { kind: "recall", question: "문제 정의의 첫 단계는?", answerGuide: "사용자 관점을 짚으면 좋습니다." },
    { kind: "apply", question: "내 상황에 적용하면?", answerGuide: "실제 사례를 하나 들어 보십시오." },
    { kind: "reflect", question: "무엇이 어려웠나요?", answerGuide: "막힌 지점을 구체적으로 적어 보십시오." },
  ],
  practiceTask: "실제 문제 1개를 5문장으로 정의해 보기",
  expectedArtifact: "문제 정의 문서 1장",
  ...over,
});

test("표준 watch URL을 파싱한다", () => {
  const parsed = parseYoutubeUrl(CANONICAL);
  assert.equal(parsed.videoId, VIDEO_ID);
  assert.equal(parsed.canonicalUrl, CANONICAL);
});

test("youtu.be 단축, shorts, embed, m.youtube를 같은 videoId로 정규화한다", () => {
  const forms = [
    `https://youtu.be/${VIDEO_ID}`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com/watch?v=${VIDEO_ID}&t=30s`,
  ];
  for (const form of forms) {
    const parsed = parseYoutubeUrl(form);
    assert.ok(parsed, `${form} 파싱 실패`);
    assert.equal(parsed.videoId, VIDEO_ID);
    assert.equal(parsed.canonicalUrl, CANONICAL);
  }
});

test("잘못된 URL은 전부 거부한다", () => {
  const bad = [
    "",
    "   ",
    "not a url",
    "https://vimeo.com/123456",
    "https://www.youtube.com/",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch",
    "javascript:alert(1)",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    `https://evil.com/watch?v=${VIDEO_ID}`,
  ];
  for (const input of bad) {
    assert.equal(parseYoutubeUrl(input), null, `${input} 를 통과시켰다`);
  }
});

test("정상 응답을 학습 자료로 변환한다", () => {
  const lesson = sanitizeLesson(validRaw(), VIDEO_ID, CANONICAL);
  assert.ok(lesson);
  assert.equal(lesson.videoId, VIDEO_ID);
  assert.equal(lesson.questions.length, 3);
  assert.equal(lesson.practiceTask, "실제 문제 1개를 5문장으로 정의해 보기");
  assert.equal(lesson.expectedArtifact, "문제 정의 문서 1장");
});

test("빈 응답·null·문자열·깨진 형태는 null을 반환한다(예외를 던지지 않는다)", () => {
  for (const input of [null, undefined, "", "not json", 42, [], {}]) {
    assert.equal(sanitizeLesson(input, VIDEO_ID, CANONICAL), null);
  }
});

test("제목·요약이 없으면 거부한다", () => {
  assert.equal(sanitizeLesson(validRaw({ title: "" }), VIDEO_ID, CANONICAL), null);
  assert.equal(sanitizeLesson(validRaw({ summary: "   " }), VIDEO_ID, CANONICAL), null);
});

test("질문이 3개 미만이면 거부한다", () => {
  const raw = validRaw({ questions: [validRaw().questions[0], validRaw().questions[1]] });
  assert.equal(sanitizeLesson(raw, VIDEO_ID, CANONICAL), null);
});

test("수행 과제·예상 산출물이 없으면 거부한다 — 영상만 보고 끝나지 않게 하기 위한 필수 항목", () => {
  assert.equal(sanitizeLesson(validRaw({ practiceTask: "" }), VIDEO_ID, CANONICAL), null);
  assert.equal(sanitizeLesson(validRaw({ expectedArtifact: "" }), VIDEO_ID, CANONICAL), null);
});

test("형식이 어긋난 타임스탬프는 버리고 나머지는 살린다", () => {
  const raw = validRaw({
    timestamps: [
      { at: "1:20", label: "정상" },
      { at: "이상함", label: "버려짐" },
      { at: "2:05", label: "정상2" },
      { at: "3:00", label: "" },
    ],
  });
  const lesson = sanitizeLesson(raw, VIDEO_ID, CANONICAL);
  assert.equal(lesson.timestamps.length, 2);
  assert.deepEqual(lesson.timestamps.map((t) => t.at), ["1:20", "2:05"]);
});

test("알 수 없는 질문 유형은 recall로 낮춰서 받아들인다", () => {
  const raw = validRaw({
    questions: validRaw().questions.map((q) => ({ ...q, kind: "unknown_kind" })),
  });
  const lesson = sanitizeLesson(raw, VIDEO_ID, CANONICAL);
  assert.ok(lesson);
  for (const question of lesson.questions) {
    assert.ok(LESSON_QUESTION_KINDS.includes(question.kind));
  }
});

test("답안 가이드가 없는 질문은 버린다(가이드 없는 질문은 학습에 쓸 수 없다)", () => {
  const questions = validRaw().questions;
  const raw = validRaw({
    questions: [...questions, { kind: "recall", question: "가이드 없음", answerGuide: "" }],
  });
  const lesson = sanitizeLesson(raw, VIDEO_ID, CANONICAL);
  assert.equal(lesson.questions.length, 3);
});

test("영상 학습 자체의 최대 증거등급 상한은 0이다", () => {
  assert.equal(LESSON_MAX_TIER, 0);
});

test("과도하게 긴 필드는 잘라내되 거부하지는 않는다", () => {
  const raw = validRaw({ summary: "가".repeat(5000), title: "나".repeat(500) });
  const lesson = sanitizeLesson(raw, VIDEO_ID, CANONICAL);
  assert.ok(lesson);
  assert.ok(lesson.summary.length <= 800);
  assert.ok(lesson.title.length <= 120);
});

// 심사 지적: LESSON_MAX_TIER 는 어디서도 읽히지 않아 리터럴이 자기 자신과 같은지만 확인하고 있었다.
// 실제 집행 지점(recognition.ts)의 값과 묶어, 한쪽만 바뀌면 실패하게 한다.
test("영상 학습 상한 상수가 실제 집행 값과 일치한다", () => {
  assert.equal(LESSON_MAX_TIER, LESSON_ONLY_MAX_TIER);
});
