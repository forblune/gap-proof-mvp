// 공개 YouTube URL 기반 학습 자료 구조 + 검증 (React/서버 비의존 순수 로직).
//
// 원칙: 영상 학습과 이해 확인(질문)은 최대 "학습 완료 / 이해 확인"까지만 인정한다.
// 더 높은 인정(수행 확인서, 증거등급 상승)에는 실제 수행 과제와 산출물이 필요하다.
// 이 파일은 그 경계를 타입과 검증으로 강제한다 — 모델이 무엇을 반환하든
// sanitizeLesson을 통과한 형태만 화면에 도달한다.

export type LessonQuestionKind = "recall" | "apply" | "reflect";

export type LessonQuestion = {
  kind: LessonQuestionKind;
  question: string;
  answerGuide: string; // 정답이 아니라 "이런 점을 짚으면 좋다"는 안내
};

export type LessonTimestamp = {
  at: string; // "3:20" 형태 — 모델이 준 문자열을 그대로 쓰되 형식만 검증
  label: string;
};

export type YoutubeLesson = {
  videoId: string;
  videoUrl: string;
  title: string;
  summary: string;
  keyConcepts: string[];
  timestamps: LessonTimestamp[];
  questions: LessonQuestion[];
  practiceTask: string; // 추천 수행 과제
  expectedArtifact: string; // 예상 산출물
};

export const LESSON_QUESTION_KINDS: LessonQuestionKind[] = ["recall", "apply", "reflect"];

export const LESSON_QUESTION_LABELS: Record<LessonQuestionKind, string> = {
  recall: "기억",
  apply: "적용",
  reflect: "성찰",
};

// 영상 학습으로 도달 가능한 인정의 상한.
// 실제 집행은 recognition.ts 의 LESSON_ONLY_MAX_TIER 가 하며, 두 값이 어긋나면 테스트가 실패한다.
// (여기 값만 두고 아무도 읽지 않으면 "집행 장치"라고 적어 놓고 집행하지 않는 상태가 된다.)
export const LESSON_MAX_RECOGNITION = "understanding_checked" as const;
export const LESSON_MAX_TIER = 0;

const MAX_KEY_CONCEPTS = 6;
const MAX_TIMESTAMPS = 8;
const MAX_QUESTIONS = 6;
const MIN_QUESTIONS = 3;

// 공개 YouTube URL만 허용한다. 단축 URL·embed·shorts를 모두 같은 videoId로 정규화한다.
export function parseYoutubeUrl(raw: string): { videoId: string; canonicalUrl: string } | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  let videoId = "";

  if (host === "youtu.be") {
    videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v") ?? "";
    } else {
      const segments = parsed.pathname.split("/").filter(Boolean);
      // /embed/<id>, /shorts/<id>, /live/<id>
      if (segments.length >= 2 && ["embed", "shorts", "live", "v"].includes(segments[0])) {
        videoId = segments[1];
      }
    }
  } else {
    return null;
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return { videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}` };
}

function trimTo(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isTimestampLike(value: string): boolean {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(value);
}

// 모델 응답 → 화면에 쓸 수 있는 형태. 어느 필드든 형식이 어긋나면 버린다(예외를 던지지 않는다).
// 최소 요건(제목·요약·질문 MIN_QUESTIONS개)을 못 채우면 null을 반환해 호출부가 실패로 처리한다.
export function sanitizeLesson(
  raw: unknown,
  videoId: string,
  videoUrl: string,
): YoutubeLesson | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;

  const title = trimTo(source.title, 120);
  const summary = trimTo(source.summary, 800);
  if (!title || !summary) return null;

  const keyConcepts = Array.isArray(source.keyConcepts)
    ? source.keyConcepts
        .map((concept) => trimTo(concept, 80))
        .filter(Boolean)
        .slice(0, MAX_KEY_CONCEPTS)
    : [];

  const timestamps = Array.isArray(source.timestamps)
    ? source.timestamps
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const item = entry as Record<string, unknown>;
          const at = trimTo(item.at, 12);
          const label = trimTo(item.label, 100);
          if (!isTimestampLike(at) || !label) return null;
          return { at, label } satisfies LessonTimestamp;
        })
        .filter((entry): entry is LessonTimestamp => entry !== null)
        .slice(0, MAX_TIMESTAMPS)
    : [];

  const questions = Array.isArray(source.questions)
    ? source.questions
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const item = entry as Record<string, unknown>;
          const kindRaw = trimTo(item.kind, 20) as LessonQuestionKind;
          const kind = LESSON_QUESTION_KINDS.includes(kindRaw) ? kindRaw : "recall";
          const question = trimTo(item.question, 220);
          const answerGuide = trimTo(item.answerGuide, 300);
          if (!question || !answerGuide) return null;
          return { kind, question, answerGuide } satisfies LessonQuestion;
        })
        .filter((entry): entry is LessonQuestion => entry !== null)
        .slice(0, MAX_QUESTIONS)
    : [];

  if (questions.length < MIN_QUESTIONS) return null;

  const practiceTask = trimTo(source.practiceTask, 300);
  const expectedArtifact = trimTo(source.expectedArtifact, 200);
  if (!practiceTask || !expectedArtifact) return null;

  return {
    videoId,
    videoUrl,
    title,
    summary,
    keyConcepts,
    timestamps,
    questions,
    practiceTask,
    expectedArtifact,
  };
}
