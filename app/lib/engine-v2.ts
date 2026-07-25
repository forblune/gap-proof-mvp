// Gate 4(#40): 삶의 경험 발견 엔진 V2 — 응답 스키마·검증(순수 함수, Node 테스트 대상).
// 원칙:
//  1) quote는 마스킹된 사용자 원문에 "그대로" 존재해야 한다(환각 방지 — 불일치 후보 폐기).
//  2) 직업은 항상 "가설"이며 연결 근거(reason)와 부족한 증거(missing)가 없으면 가설을 버린다.
//  3) 열거형 밖 값은 안전 기본값으로 강등한다(요청을 실패시키지 않되 과장 방지 방향으로).
//  4) 적성·취업 가능성 판정 어휘가 섞인 가설 제목은 폐기한다.

export const FACT_STATUS = ["확인됨", "부분 확인", "계획·관심"] as const;
export const SIGNALS = ["반복", "책임", "문제 해결", "몰입"] as const;
export const EVIDENCE_STRENGTH = ["강함", "보통", "약함"] as const;

export type FactStatus = (typeof FACT_STATUS)[number];
export type Signal = (typeof SIGNALS)[number];
export type EvidenceStrength = (typeof EVIDENCE_STRENGTH)[number];

export type JobHypothesis = { title: string; reason: string; missing: string };

export type ClaimV2 = {
  skill: string;
  quote: string;
  factStatus: FactStatus;
  context: string;
  behaviors: string[];
  signals: Signal[];
  evidenceStrength: EvidenceStrength;
  overclaimRisk: string | null;
  question: string;
  jobHypotheses: JobHypothesis[];
  smallStep: string;
};

const MAX_CLAIMS = 3;
const MAX_BEHAVIORS = 3;
const MAX_HYPOTHESES = 2;

// 판정성 어휘 — 직업 "가설" 제목에 섞이면 해당 가설을 폐기한다
const VERDICT_WORDS = ["적합", "천직", "적성", "합격", "보장", "가능성 높", "확실", "전문가"];

function cleanString(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeQuote(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// 인용 정합: 공백 정규화 후 원문에 연속 부분 문자열로 존재해야 한다
export function quoteInSource(quote: string, source: string): boolean {
  const q = normalizeQuote(quote);
  if (q.length < 5) return false;
  return normalizeQuote(source).includes(q);
}

function sanitizeHypotheses(raw: unknown): JobHypothesis[] {
  if (!Array.isArray(raw)) return [];
  const out: JobHypothesis[] = [];
  for (const item of raw.slice(0, MAX_HYPOTHESES * 2)) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const title = cleanString(record.title, 60);
    const reason = cleanString(record.reason, 200);
    const missing = cleanString(record.missing, 200);
    // 근거 또는 부족 증거가 없는 가설, 판정성 어휘가 섞인 가설은 버린다
    if (!title || !reason || !missing) continue;
    if (VERDICT_WORDS.some((word) => title.includes(word) || reason.includes(word))) continue;
    out.push({ title, reason, missing });
    if (out.length >= MAX_HYPOTHESES) break;
  }
  return out;
}

// 모델 응답(raw)을 검증된 ClaimV2 배열로. source는 마스킹된 사용자 원문.
export function sanitizeClaimsV2(raw: unknown, source: string): ClaimV2[] {
  const list = Array.isArray((raw as { claims?: unknown[] })?.claims)
    ? ((raw as { claims: unknown[] }).claims)
    : [];
  const out: ClaimV2[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const skill = cleanString(record.skill, 60);
    const quote = cleanString(record.quote, 300);
    const question = cleanString(record.question, 200);
    if (!skill || !quote || !question) continue;
    if (!quoteInSource(quote, source)) continue; // 환각 방지 — 원문에 없으면 폐기

    const factStatus = FACT_STATUS.includes(record.factStatus as FactStatus)
      ? (record.factStatus as FactStatus)
      : "부분 확인"; // 모르면 단정하지 않는 쪽으로
    const strength = EVIDENCE_STRENGTH.includes(record.evidenceStrength as EvidenceStrength)
      ? (record.evidenceStrength as EvidenceStrength)
      : "약함"; // 모르면 약한 쪽으로(과장 방지)
    const behaviors = Array.isArray(record.behaviors)
      ? record.behaviors.map((behavior) => cleanString(behavior, 80)).filter(Boolean).slice(0, MAX_BEHAVIORS)
      : [];
    const signals = Array.isArray(record.signals)
      ? ([...new Set(record.signals.filter((signal) => SIGNALS.includes(signal as Signal)))] as Signal[]).slice(0, SIGNALS.length)
      : [];
    const overclaim = cleanString(record.overclaimRisk, 200);

    out.push({
      skill,
      quote,
      factStatus,
      context: cleanString(record.context, 120),
      behaviors,
      signals,
      evidenceStrength: strength,
      overclaimRisk: overclaim || null,
      question,
      jobHypotheses: sanitizeHypotheses(record.jobHypotheses),
      smallStep: cleanString(record.smallStep, 160),
    });
    if (out.length >= MAX_CLAIMS) break;
  }
  return out;
}
