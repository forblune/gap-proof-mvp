type AnalysisClaim = {
  id: number;
  skill: string;
  quote: string;
  source: string;
  tier: 0;
  confidence: "확인 필요";
  question: string;
  status: "pending";
};

type SolarClaim = {
  skill?: unknown;
  quote?: unknown;
  question?: unknown;
};

const SOLAR_URL = "https://api.upstage.ai/v1/chat/completions";
function readEnv(key: string): string | undefined {
  try {
    return typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
}
const MODEL = readEnv("SOLAR_MODEL") || "solar-pro3";
const MAX_INPUT_LENGTH = 3000;
const SOLAR_TIMEOUT_MS = 12_000;

const SYSTEM_PROMPT = `너는 GapProof의 역량 후보 추출 보조다.
사용자의 전공, 학습, 일, 프로젝트 경험에서 최대 3개의 역량 후보를 찾는다.
적성, 취업 가능성, 숙련도, 성격을 판정하지 마라.
quote는 반드시 사용자 원문에 연속해서 실제로 존재하는 문장을 그대로 복사하라.
과장하거나 사용자가 하지 않은 행동을 추가하지 마라.
각 후보는 skill, quote, question 세 필드만 가진다.
question은 그 역량을 더 강한 증거로 바꾸기 위해 필요한 링크, 산출물, 기간, 역할 중 하나를 묻는다.
JSON 객체 {"claims":[...]}만 출력하라.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
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
  const rawClaims =
    value && typeof value === "object" && Array.isArray((value as { claims?: unknown }).claims)
      ? ((value as { claims: unknown[] }).claims as SolarClaim[])
      : [];

  const normalized: AnalysisClaim[] = [];
  const seen = new Set<string>();

  for (const raw of rawClaims.slice(0, 6)) {
    const skill = trimText(raw?.skill, 80);
    const quote = trimText(raw?.quote, 280);
    const question = trimText(raw?.question, 160);

    if (!skill || !quote || !question) continue;
    if (!experience.includes(quote)) continue;
    if (seen.has(skill)) continue;
    seen.add(skill);
    normalized.push({
      id: normalized.length + 1,
      skill,
      quote,
      source: "사용자 입력",
      tier: 0,
      confidence: "확인 필요",
      question,
      status: "pending",
    });
    if (normalized.length === 3) break;
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
  let body: { experience?: unknown };
  try {
    body = (await request.json()) as { experience?: unknown };
  } catch {
    return json({ error: "invalid_json", message: "요청 형식을 확인해 주세요." }, 400);
  }

  const experience = trimText(body.experience, MAX_INPUT_LENGTH + 1);
  if (experience.length < 20) {
    return json({ error: "input_too_short", message: "경험을 20자 이상 적어 주세요." }, 400);
  }
  if (experience.length > MAX_INPUT_LENGTH) {
    return json({ error: "input_too_long", message: "경험은 3,000자 이내로 적어 주세요." }, 413);
  }

  const fallback = fallbackClaims(experience);
  const apiKey = readEnv("UPSTAGE_API_KEY");
  if (!apiKey) {
    return json({
      source: "sample",
      model: null,
      claims: fallback,
      notice: "Solar API 키가 없어 규칙 기반 샘플 결과를 표시합니다.",
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
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: experience },
        ],
        temperature: 0.2,
        max_tokens: 700,
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
        notice: "Solar 연결이 불안정해 규칙 기반 샘플 결과를 표시합니다.",
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
        notice: "원문과 일치하는 Solar 후보가 없어 샘플 결과를 표시합니다.",
      });
    }

    return json({
      source: "solar",
      model: MODEL,
      claims,
      notice: "Solar가 만든 후보입니다. 사용자가 확인하기 전에는 증명으로 사용하지 않습니다.",
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
      notice: "Solar 응답을 받지 못해 규칙 기반 샘플 결과를 표시합니다.",
    });
  } finally {
    clearTimeout(timer);
  }
}
