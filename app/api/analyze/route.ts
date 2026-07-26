import { sanitizeClaimsV2, type ClaimV2 } from "../../lib/engine-v2";

// Gate 4(#40): V2 필드는 전부 선택적 — 클라이언트는 없으면 렌더하지 않는다.
type AnalysisClaim = {
  id: number;
  skill: string;
  quote: string;
  source: string;
  tier: 0;
  confidence: "확인 필요";
  question: string;
  status: "pending";
  factStatus?: ClaimV2["factStatus"];
  context?: string;
  behaviors?: string[];
  signals?: ClaimV2["signals"];
  evidenceStrength?: ClaimV2["evidenceStrength"];
  overclaimRisk?: string | null;
  jobHypotheses?: ClaimV2["jobHypotheses"];
  smallStep?: string;
};

import { verifyGateSession } from "../../lib/gate-session";
import { DEFAULT_MODEL_ID, isAllowedModel } from "../../lib/models";
import { maskPII, maskedNoticeSuffix } from "../../lib/pii";
import { checkRateLimit, clientKey, RATE_LIMIT_WINDOW_SECONDS } from "../../lib/rate-limit";
import { readServerEnv } from "../../lib/server-env";

const SOLAR_URL = "https://api.upstage.ai/v1/chat/completions";
const MAX_INPUT_LENGTH = 10000; // Gate 3(#39): 화면 카운터와 일치
const SOLAR_TIMEOUT_MS = 30_000; // V2(최대 1,600토큰) 생성 시간 반영 — 12초는 V1(700토큰) 기준이라 운영에서 전부 타임아웃 폴백됐다

const SYSTEM_PROMPT = `너는 GapProof의 "삶의 경험 발견" 보조다.
학교·일뿐 아니라 돌봄, 게임, 커뮤니티, SNS, 취미, 독학, 쉬었던 시기의 경험에서 최대 3개의 역량 후보를 찾는다.

절대 규칙:
- 적성, 취업 가능성, 숙련도, 성격을 판정하지 마라.
- 게임을 많이 했다는 사실만으로 게임 코치를, SNS를 많이 봤다는 사실만으로 마케팅 전문가를 단정하지 마라. 직업은 근거 있는 "가설"로만 제시한다.
- quote는 반드시 사용자 원문에 연속해서 실제로 존재하는 문장을 그대로 복사하라.
- 사용자가 하지 않은 행동을 만들지 마라. 원문에 근거가 없으면 그 항목은 비워라.

각 후보 필드:
- skill: 역량 후보 이름(과장 금지)
- quote: 원문 그대로의 근거 문장
- factStatus: "확인됨"(결과·산출물이 원문에 있음) | "부분 확인"(행동은 있으나 결과 불명) | "계획·관심"(하고 싶다는 서술)
- context: 시간·상황 한 줄
- behaviors: 원문에서 확인되는 실제 행동 1~3개
- signals: ["반복","책임","문제 해결","몰입"] 중 원문 근거가 있는 것만
- evidenceStrength: "강함"(산출물·수치) | "보통"(구체 행동) | "약함"(서술뿐)
- overclaimRisk: 이 후보가 과장되기 쉬운 지점 한 문장(없으면 null)
- question: 더 강한 증거로 바꾸기 위한 확인 질문 하나
- jobHypotheses: 최대 2개. 각각 title(직업 가설), reason(원문 행동과의 연결 근거), missing(부족한 증거). 근거가 약하면 빈 배열.
- smallStep: 이번 주에 가능한 작은 검증 행동 하나

JSON 객체 {"claims":[...]}만, 불필요한 공백·줄바꿈 없이 압축해 출력하라.`;

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

function trimText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sourceSentences(experience: string) {
  const sentences = experience
    .split(/(?<=[.!?。！？])\s+|[\n]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8);

  return sentences.length ? sentences : [experience.trim()];
}

function fallbackClaims(experience: string): AnalysisClaim[] {
  const sentences = sourceSentences(experience);
  const candidates = [
    {
      keywords: ["프로젝트", "만들", "개발", "웹", "API", "아두이노"],
      skill: "디지털 프로젝트를 시도한 경험",
      question: "직접 만든 범위와 작동 화면 또는 링크를 추가할 수 있나요?",
    },
    {
      keywords: ["공부", "학습", "강의", "수료", "독학", "수학"],
      skill: "필요한 지식을 스스로 학습한 경험",
      question: "학습 기간과 이를 적용한 과제 또는 결과물이 있나요?",
    },
    {
      keywords: ["전공", "학교", "대학", "과"],
      skill: "전공 경험을 새로운 분야와 연결한 시도",
      question: "전공 지식을 실제 문제 해결에 사용한 사례가 있나요?",
    },
    {
      keywords: ["일", "업무", "아르바이트", "회사"],
      skill: "업무 경험에서 얻은 실행 역량 후보",
      question: "담당 역할과 결과를 보여주는 기록이 있나요?",
    },
  ];

  const used = new Set<string>();
  const claims: AnalysisClaim[] = [];

  for (const candidate of candidates) {
    const quote = sentences.find(
      (sentence) =>
        !used.has(sentence) &&
        candidate.keywords.some((keyword) => sentence.includes(keyword)),
    );
    if (!quote) continue;
    used.add(quote);
    claims.push({
      id: claims.length + 1,
      skill: candidate.skill,
      quote: quote.slice(0, 280),
      source: "사용자 입력",
      tier: 0,
      confidence: "확인 필요",
      question: candidate.question,
      status: "pending",
      // 규칙 기반 샘플은 단정하지 않는다: 상태·강도만 보수적으로, 가설은 비움
      factStatus: "부분 확인",
      evidenceStrength: "약함",
      jobHypotheses: [],
    });
    if (claims.length === 3) break;
  }

  if (!claims.length) {
    claims.push({
      id: 1,
      skill: "경험을 구체화할 수 있는 역량 후보",
      quote: sentences[0].slice(0, 280),
      source: "사용자 입력",
      tier: 0,
      confidence: "확인 필요",
      question: "이 경험에서 직접 한 행동과 남은 결과물은 무엇인가요?",
      status: "pending",
    });
  }

  return claims;
}

function normalizeSolarClaims(experience: string, value: unknown): AnalysisClaim[] {
  // Gate 4(#40): 검증(인용 정합·열거형 강등·가설 근거 필수·판정 어휘 차단)은 engine-v2가 담당
  const v2 = sanitizeClaimsV2(value, experience);
  const seen = new Set<string>();
  const normalized: AnalysisClaim[] = [];
  for (const claim of v2) {
    if (seen.has(claim.skill)) continue;
    seen.add(claim.skill);
    normalized.push({
      id: normalized.length + 1,
      skill: claim.skill,
      quote: claim.quote,
      source: "사용자 입력",
      tier: 0,
      confidence: "확인 필요",
      question: claim.question,
      status: "pending",
      factStatus: claim.factStatus,
      context: claim.context,
      behaviors: claim.behaviors,
      signals: claim.signals,
      evidenceStrength: claim.evidenceStrength,
      overclaimRisk: claim.overclaimRisk,
      jobHypotheses: claim.jobHypotheses,
      smallStep: claim.smallStep,
    });
  }
  return normalized;
}

function parseSolarContent(content: string) {
  const cleaned = content.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // 인증을 가장 먼저 검사한다: 비인증 요청은 본문 파싱·폴백 생성·Solar 호출(비용 경로)에 도달하지 않는다.
  if (!(await verifyGateSession(request))) {
    return json(
      { error: "unauthorized", message: "데모 코드 확인이 필요해요. 시작 화면에서 코드를 입력해 주세요." },
      401,
    );
  }

  // 남용 방지: 유료 Solar 호출·폴백 생성 이전에 한도를 검사한다.
  // 실제 Workers에서 바인딩이 없거나 실패하면 fail-closed(503) — 조용한 대체 없음.
  const rateDecision = await checkRateLimit("ANALYZE_RATE_LIMITER", await clientKey(request));
  if (rateDecision === "unavailable") {
    return json(
      { error: "rate_limit_unavailable", message: "요청 한도 확인이 불가해 분석을 잠시 멈췄어요. 잠시 후 다시 시도해 주세요." },
      503,
    );
  }
  if (rateDecision === "limited") {
    return json(
      { error: "rate_limited", message: "요청이 잠시 몰렸어요. 1분 뒤에 다시 시도해 주세요." },
      429,
      { "retry-after": String(RATE_LIMIT_WINDOW_SECONDS) },
    );
  }

  let body: { experience?: unknown; model?: unknown };
  try {
    body = (await request.json()) as { experience?: unknown; model?: unknown };
  } catch {
    return json({ error: "invalid_json", message: "요청 형식을 확인해 주세요." }, 400);
  }

  // 모델 allowlist: 등록된 모델만 허용. 임의 문자열은 안전한 400으로 거부하며
  // 요청 값을 응답에 되돌려주지 않는다(반사 방지).
  const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
  if (requestedModel && !isAllowedModel(requestedModel)) {
    return json(
      { error: "model_not_allowed", message: "선택한 모델은 사용할 수 없어요. 목록에서 다시 선택해 주세요." },
      400,
    );
  }

  const rawExperience = trimText(body.experience, MAX_INPUT_LENGTH + 1);
  if (rawExperience.length < 20) {
    return json({ error: "input_too_short", message: "경험을 20자 이상 적어 주세요." }, 400);
  }
  if (rawExperience.length > MAX_INPUT_LENGTH) {
    return json({ error: "input_too_long", message: "경험은 10,000자 이내로 적어 주세요. 지금 내용은 그대로 두고 넘치는 만큼만 줄여 주세요." }, 413);
  }

  // PII 최소화: 마스킹된 텍스트가 이후 분석·인용 검증의 기준이 된다(원문은 전송하지 않음).
  const { text: experience, maskedKinds } = maskPII(rawExperience);
  const maskedNote = maskedNoticeSuffix(maskedKinds);

  const fallback = fallbackClaims(experience);
  const apiKey = await readServerEnv("UPSTAGE_API_KEY");
  // 우선순위: 사용자가 선택한 허용 모델 > 운영자 env(허용 목록 내일 때) > 기본 모델
  const envModel = await readServerEnv("SOLAR_MODEL");
  const model =
    requestedModel || (envModel && isAllowedModel(envModel) ? envModel : DEFAULT_MODEL_ID);
  if (!apiKey) {
    return json({
      source: "sample",
      model: null,
      claims: fallback,
      notice: "Solar API 키가 없어 규칙 기반 샘플 결과를 표시합니다." + maskedNote,
      masked: maskedKinds,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOLAR_TIMEOUT_MS);

  try {
    const response = await fetch(SOLAR_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: experience },
        ],
        temperature: 0.2,
        max_tokens: 1600, // V2 3후보 압축 JSON에 충분하면서 생성 시간을 30초 한도 안에 두는 균형값(700은 잘림, 2048은 12초 타임아웃 유발)
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Solar analysis failed", response.status);
      return json({
        source: "sample",
        model: null,
        claims: fallback,
        notice: "Solar 연결이 불안정해 규칙 기반 샘플 결과를 표시합니다." + maskedNote,
        masked: maskedKinds,
      });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || "";
    const claims = normalizeSolarClaims(experience, parseSolarContent(content));

    if (!claims.length) {
      return json({
        source: "sample",
        model: null,
        claims: fallback,
        notice: "원문과 일치하는 Solar 후보가 없어 샘플 결과를 표시합니다." + maskedNote,
        masked: maskedKinds,
      });
    }

    return json({
      source: "solar",
      model,
      claims,
      notice: "Solar가 만든 후보입니다. 사용자가 확인하기 전에는 증명으로 사용하지 않습니다." + maskedNote,
      masked: maskedKinds,
    });
  } catch (error) {
    console.error(
      "Solar analysis request failed",
      error instanceof Error ? error.name : "Error",
    );
    return json({
      source: "sample",
      model: null,
      claims: fallback,
      notice: "Solar 응답을 받지 못해 규칙 기반 샘플 결과를 표시합니다." + maskedNote,
      masked: maskedKinds,
    });
  } finally {
    clearTimeout(timer);
  }
}
