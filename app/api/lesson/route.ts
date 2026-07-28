// 공개 YouTube URL → 구조화된 학습 자료(Gemini). analyze/route.ts와 동일한 방어 순서를 따른다:
// 인증 → 요청 한도 → JSON 파싱 → 입력 검증 → 서버 전용 키 → 타임아웃 → 실패 시 안전한 응답.
//
// API 키는 서버에서만 읽는다(readServerEnv). 이 파일은 서버 라우트이므로 클라이언트 번들에
// 포함되지 않으며, 키 값이 응답 본문·에러 메시지에 실려 나가지 않는다.
//
// 인정 경계: 이 라우트가 만드는 것은 "학습 자료"일 뿐이다. 영상 시청과 질문 응답은
// 최대 학습 완료·이해 확인까지만 인정되며, 증거등급은 여기서 오르지 않는다(recognition.ts).

import { verifyGateSession } from "../../lib/gate-session";
import { checkRateLimit, clientKey, RATE_LIMIT_WINDOW_SECONDS } from "../../lib/rate-limit";
import { readServerEnv } from "../../lib/server-env";
import { parseYoutubeUrl, sanitizeLesson } from "../../lib/youtube-lesson";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `너는 GapProof의 학습 자료 정리 보조다. 주어진 공개 YouTube 영상 하나를 학습자가 따라갈 수 있는 형태로 정리한다.

절대 규칙:
- 학습자의 적성·취업 가능성·역량 수준을 판정하지 마라.
- 영상에서 확인할 수 없는 내용을 지어내지 마라. 확실하지 않으면 그 항목을 비워라.
- 학습자가 실제로 무엇을 했다고 단정하지 마라. 너는 자료만 정리한다.
- 질문은 정답 맞히기가 아니라 스스로 확인하기 위한 것이다. answerGuide는 "이런 점을 짚으면 좋다"는 안내로 쓴다.
- practiceTask는 영상만 보고 끝나지 않도록, 학습자가 직접 해 볼 수 있는 작은 과제 하나여야 한다.
- expectedArtifact는 그 과제를 하면 실제로 남는 결과물(문서·코드·기록 등)이어야 한다.

JSON 객체 하나만 출력하라:
{"title":"영상 제목","summary":"3~5문장 요약","keyConcepts":["핵심 개념"],"timestamps":[{"at":"3:20","label":"구간 설명"}],"questions":[{"kind":"recall|apply|reflect","question":"질문","answerGuide":"답안 가이드"}],"practiceTask":"추천 수행 과제","expectedArtifact":"예상 산출물"}

questions는 recall·apply·reflect를 각각 최소 1개씩 포함해 3~6개로 만들어라.`;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

// 모델이 코드펜스나 설명을 섞어 보내도 첫 JSON 객체만 뽑아낸다.
function parseGeminiContent(content: string): unknown {
  const trimmed = (content ?? "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export async function POST(request: Request) {
  if (!(await verifyGateSession(request))) {
    return json(
      { error: "unauthorized", message: "데모 코드 확인이 필요합니다. 시작 화면에서 코드를 입력해 주십시오." },
      401,
    );
  }

  // 유료 호출 이전에 한도를 검사한다. 바인딩이 없으면 fail-closed(503).
  const rateDecision = await checkRateLimit("ANALYZE_RATE_LIMITER", await clientKey(request));
  if (rateDecision === "unavailable") {
    return json(
      { error: "rate_limit_unavailable", message: "요청 한도 확인이 불가해 학습 자료 만들기를 잠시 멈췄습니다. 잠시 후 다시 시도해 주십시오." },
      503,
    );
  }
  if (rateDecision === "limited") {
    return json(
      { error: "rate_limited", message: "요청이 잠시 몰렸습니다. 1분 뒤에 다시 시도해 주십시오." },
      429,
      { "retry-after": String(RATE_LIMIT_WINDOW_SECONDS) },
    );
  }

  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return json({ error: "invalid_json", message: "요청 형식을 확인해 주십시오." }, 400);
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim().slice(0, 2048) : "";
  const parsed = parseYoutubeUrl(rawUrl);
  if (!parsed) {
    return json(
      {
        error: "invalid_url",
        message: "공개 YouTube 영상 주소를 확인해 주십시오. 예: https://www.youtube.com/watch?v=... 또는 https://youtu.be/...",
      },
      400,
    );
  }

  const apiKey = await readServerEnv("GEMINI_API_KEY");
  if (!apiKey) {
    // 키가 없을 때 조용히 가짜 자료를 만들지 않는다 — 만들어 낸 학습 자료는 증거 원칙에 어긋난다.
    return json(
      {
        error: "lesson_unavailable",
        message: "학습 자료 생성이 아직 연결되지 않았습니다. 영상은 직접 보시고, 아래에서 배운 내용을 직접 적어 주십시오.",
      },
      503,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: `다음 공개 YouTube 영상을 학습 자료로 정리해 주십시오: ${parsed.canonicalUrl}` },
              { fileData: { fileUri: parsed.canonicalUrl } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // 상태 코드만 기록한다(키·요청 URL·본문 로그 금지 — 키가 쿼리스트링에 들어가므로).
      console.error("Gemini lesson failed", response.status);
      if (response.status === 401 || response.status === 403) {
        return json(
          { error: "lesson_unauthorized", message: "학습 자료 생성 인증에 실패했습니다. 운영자에게 문의해 주십시오." },
          502,
        );
      }
      if (response.status === 429) {
        // 키는 유효하지만 사용 한도를 넘은 상태 — 사용자에게 원인을 정확히 알린다.
        return json(
          {
            error: "lesson_quota_exceeded",
            message:
              "학습 자료 생성 한도를 모두 사용했습니다. 잠시 후 다시 시도하시거나, 영상은 직접 보시고 배운 내용을 아래에 적어 주십시오.",
          },
          429,
          { "retry-after": "60" },
        );
      }
      const message =
        response.status === 400 || response.status === 404
          ? "이 영상은 학습 자료로 불러올 수 없습니다. 공개 영상인지 확인해 주십시오."
          : "학습 자료를 만들지 못했습니다. 잠시 후 다시 시도해 주십시오.";
      return json({ error: "lesson_failed", message }, 502);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const lesson = sanitizeLesson(parseGeminiContent(content), parsed.videoId, parsed.canonicalUrl);

    if (!lesson) {
      return json(
        {
          error: "lesson_invalid",
          message: "학습 자료 형식을 확인하지 못했습니다. 다시 시도하거나, 배운 내용을 직접 적어 주십시오.",
        },
        502,
      );
    }

    return json({
      lesson,
      notice:
        "AI가 정리한 자료입니다. 내용을 직접 확인하고 고쳐 주십시오. 영상 학습과 질문은 학습 완료·이해 확인까지만 인정되며, 증거등급은 실제 수행과 산출물이 있어야 오릅니다.",
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error("Gemini lesson request failed", name);
    return json(
      {
        error: name === "AbortError" ? "lesson_timeout" : "lesson_failed",
        message:
          name === "AbortError"
            ? "학습 자료를 만드는 데 시간이 너무 오래 걸렸습니다. 다시 시도해 주십시오."
            : "학습 자료를 만들지 못했습니다. 잠시 후 다시 시도해 주십시오.",
      },
      504,
    );
  } finally {
    clearTimeout(timer);
  }
}
