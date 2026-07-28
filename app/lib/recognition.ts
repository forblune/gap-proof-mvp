// GapProof 인정 체계(Recognition) — 문서·UI·테스트가 공유하는 단일 진실 소스.
//
// 핵심 원칙(기획서 v3 기준):
//  - GapProof는 취업 가능성·적성·역량을 판정하지 않는다.
//  - 사용자의 원문에서 확인되는 근거만 사용한다. 하지 않은 일을 만들어내지 않는다.
//  - AI가 제안하고 사용자가 확인한 것만 최종 결과에 들어간다.
//  - 학습 완료 / 이해 확인 / 실제 수행 / 산출물 / 외부 증빙 / 제3자 검토는 서로 다른 인정이다.
//  - 퀴즈 통과만으로는 실제 수행이나 높은 증거등급을 얻을 수 없다.
//  - 증거가 0개면 최종 결과(Proof Card)로 통과시키지 않는다.

// ── 인정 유형 ───────────────────────────────────────────────────────────────
// 각 유형이 "무엇을 말해 주는지"와 "무엇을 말해 주지 않는지"를 함께 정의한다.
// limits를 비워 두지 않는 것이 이 표의 목적이다 — 한계 없는 인정은 과장이 된다.

export type RecognitionKindId =
  | "learning_completed" // 학습 완료
  | "understanding_checked" // 이해 확인
  | "performance_done" // 실제 수행
  | "artifact_linked" // 산출물 연결
  | "external_credential" // 외부 증빙
  | "third_party_reviewed"; // 제3자 검토

export type RecognitionKind = {
  id: RecognitionKindId;
  label: string;
  means: string; // 이 인정이 말해 주는 것
  limits: string; // 이 인정이 말해 주지 않는 것 (필수)
  maxTier: number; // 이 유형 단독으로 도달 가능한 최대 증거등급
};

export const RECOGNITION_KINDS: RecognitionKind[] = [
  {
    id: "learning_completed",
    label: "학습 완료",
    means: "학습 자료를 끝까지 봤다는 사실.",
    limits: "그 내용을 이해했는지, 실제로 해 봤는지는 말해 주지 않습니다.",
    maxTier: 0,
  },
  {
    id: "understanding_checked",
    label: "이해 확인",
    means: "학습 내용을 질문으로 되짚어 답할 수 있었다는 사실.",
    limits: "실제 업무나 과제에서 해냈다는 뜻은 아닙니다. 이해 확인만으로는 수행 증거가 되지 않습니다.",
    maxTier: 0,
  },
  {
    id: "performance_done",
    label: "실제 수행",
    means: "학습한 내용을 실제 과제나 상황에서 직접 해 봤다는 사용자 기록.",
    limits: "결과물이 남아 있지 않으면 제3자가 다시 확인할 수는 없습니다.",
    maxTier: 1,
  },
  {
    id: "artifact_linked",
    label: "산출물 연결",
    means: "직접 만든 결과물(문서·저장소·작업 링크)이 실제로 남아 있다는 사실.",
    limits: "결과물의 품질이나 완성도를 GapProof가 평가하지는 않습니다.",
    maxTier: 2,
  },
  {
    id: "external_credential",
    label: "외부 증빙",
    means: "외부 기관이 발급한 수료증·자격증이 있다는 사실.",
    limits: "발급기관·발급일·문서번호를 사용자가 입력한 그대로 기록할 뿐, GapProof가 진위를 검증하지는 않습니다.",
    maxTier: 2,
  },
  {
    id: "third_party_reviewed",
    label: "제3자 검토",
    means: "상담사·교육기관 등 지정 주체가 내용을 확인했다는 사실.",
    limits: "이번 데모 범위 밖입니다(Phase 2).",
    maxTier: 3,
  },
];

export function findRecognitionKind(id: string): RecognitionKind | undefined {
  return RECOGNITION_KINDS.find((kind) => kind.id === id);
}

// ── 증거등급 상승/금지 조건 ─────────────────────────────────────────────────
// engine.ts의 tierFromLink·competencyStrength와 같은 규칙을 사람이 읽는 형태로 둔 것.
// 두 곳이 어긋나면 tests/recognition.test.mjs가 실패한다.

export type TierRule = {
  tier: number;
  name: string;
  raiseWhen: string; // 이 등급으로 오르는 조건
  neverWhen: string; // 이 등급으로 올릴 수 없는 경우(금지 조건)
};

export const TIER_RULES: TierRule[] = [
  {
    tier: 0,
    name: "자기기록",
    raiseWhen: "사용자가 원문에서 확인한 역량 후보 — 모든 증거의 출발점입니다.",
    neverWhen: "사용자가 확인하지 않은 AI 제안은 여기에도 들어오지 못합니다.",
  },
  {
    tier: 1,
    name: "근거 연결",
    raiseWhen: "그 역량에 노트·저장소·수료증 등 확인 가능한 링크가 연결된 경우.",
    neverWhen: "링크 없이 설명만 덧붙이는 것으로는 오르지 않습니다.",
  },
  {
    tier: 2,
    name: "수행 확인",
    raiseWhen:
      "그 역량에 확인된 근거가 이미 있고, 실제 수행·산출물이 연결되었거나 이해 확인까지 마친 경우.",
    neverWhen:
      "학습을 끝냈다는 사실만으로, 또는 이해 확인(퀴즈) 통과만으로는 절대 오르지 않습니다. 확인된 근거가 0개면 이해 확인을 통과해도 오르지 않습니다.",
  },
  {
    tier: 3,
    name: "기관 확인",
    raiseWhen: "학교·교육기관·상담사 등 지정 주체가 확인한 경우.",
    neverWhen: "이번 데모에서는 어떤 경로로도 부여하지 않습니다(Phase 2).",
  },
];

// ── 발급 문서 유형 ──────────────────────────────────────────────────────────
// 수료증 / 수행 확인서 / 외부 증빙 기록은 서로 다른 문서다. 이 차이가 흐려지면
// "퀴즈만 풀고 수행했다고 말하는" 문제가 다시 생긴다.

export type CertificateKindId = "learning" | "performance" | "external_record";

export type CertificateKind = {
  id: CertificateKindId;
  label: string;
  issuedFor: string; // 무엇에 대해 발급하는가
  requires: string; // 발급 조건
  doesNotMean: string; // 이 문서가 뜻하지 않는 것
};

export const CERTIFICATE_KINDS: CertificateKind[] = [
  {
    id: "learning",
    label: "학습 수료증",
    issuedFor: "학습 자료를 끝까지 보고 필수 질문에 답한 사실",
    requires: "학습 자료 완료 + 필수 질문 전체 응답",
    doesNotMean: "실제로 수행했다는 뜻이 아닙니다. 증거등급을 올리지 않습니다.",
  },
  {
    id: "performance",
    label: "수행 확인서",
    issuedFor: "실제 과제를 수행하고 결과물을 남긴 사실",
    requires: "학습 수료 조건 + 유효한 산출물 링크 1개 이상 + 사용자의 수행 기록",
    doesNotMean: "결과물의 품질을 GapProof가 평가하거나 보증하지 않습니다.",
  },
  {
    id: "external_record",
    label: "외부 증빙 기록",
    issuedFor: "외부 기관이 발급한 수료증·자격증을 사용자가 등록한 사실",
    requires: "발급기관 · 발급일 · 문서번호 입력",
    doesNotMean:
      "GapProof가 진위를 검증했다는 뜻이 아닙니다. 사용자가 입력한 내용을 그대로 기록할 뿐입니다.",
  },
];

// 모든 발급 문서에 공통으로 표기하는 고지 — 화면·인쇄본 양쪽에 반드시 들어간다.
export const CERTIFICATE_ISSUER = "Forblune · GapProof";
export const CERTIFICATE_DISCLAIMER =
  "이 문서는 공인 자격이나 국가 공인 학점이 아닙니다. GapProof가 확인한 범위만 기록합니다.";

// ── 발급 조건 판정 ──────────────────────────────────────────────────────────

export type ArtifactLink = {
  url: string;
  note?: string;
};

export type LearningRecord = {
  competencyId: string;
  competencyLabel: string;
  sourceTitle: string; // 학습한 자료 제목
  sourceUrl?: string;
  requiredQuestionCount: number;
  answeredQuestionCount: number;
  understandingChecked: boolean; // 이해 확인(퀴즈) 통과 여부
  performanceNote?: string; // 사용자가 직접 쓴 수행 기록
  artifacts: ArtifactLink[];
};

export type IssueDecision = {
  eligible: boolean;
  missing: string[]; // 아직 충족하지 않은 조건(사용자에게 그대로 보여 준다)
  nextStep: string | null; // 가장 작은 다음 행동
};

// http/https 링크만 산출물로 인정한다. 빈 문자열·상대경로·javascript: 등은 제외.
export function isValidArtifactUrl(url: string): boolean {
  const trimmed = (url ?? "").trim();
  if (trimmed.length === 0) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validArtifacts(record: LearningRecord): ArtifactLink[] {
  return (record.artifacts ?? []).filter((artifact) => isValidArtifactUrl(artifact.url));
}

// 학습 수료증: 자료를 끝까지 보고 필수 질문에 전부 답했으면 발급 가능.
// 이해 확인(퀴즈) 통과는 요구하지 않는다 — 학습 수료증은 "봤다"는 사실만 말한다.
export function canIssueLearningCertificate(record: LearningRecord): IssueDecision {
  const missing: string[] = [];
  if (record.requiredQuestionCount <= 0) {
    missing.push("학습 질문이 아직 준비되지 않았습니다.");
  } else if (record.answeredQuestionCount < record.requiredQuestionCount) {
    const left = record.requiredQuestionCount - record.answeredQuestionCount;
    missing.push(`필수 질문 ${left}개에 아직 답하지 않았습니다.`);
  }
  return {
    eligible: missing.length === 0,
    missing,
    nextStep: missing.length === 0 ? null : "학습 질문에 먼저 답해 주십시오.",
  };
}

// 수행 확인서: 학습 수료 조건에 더해 실제 수행 기록과 유효한 산출물 링크가 있어야 한다.
// 이해 확인(퀴즈) 통과만으로는 절대 발급되지 않는다.
export function canIssuePerformanceCertificate(record: LearningRecord): IssueDecision {
  const missing: string[] = [];
  const learning = canIssueLearningCertificate(record);
  if (!learning.eligible) missing.push(...learning.missing);

  const artifacts = validArtifacts(record);
  if (artifacts.length === 0) {
    missing.push("실제로 만든 결과물 링크가 아직 없습니다(http/https 주소).");
  }
  if (!(record.performanceNote ?? "").trim()) {
    missing.push("무엇을 직접 해 봤는지 한 줄 기록이 아직 없습니다.");
  }

  return {
    eligible: missing.length === 0,
    missing,
    nextStep:
      missing.length === 0
        ? null
        : artifacts.length === 0
          ? "학습한 내용으로 작은 결과물을 하나 만들고 링크를 남겨 주십시오."
          : "무엇을 직접 해 봤는지 한 줄로 남겨 주십시오.",
  };
}

// 이 학습 기록이 도달한 인정 유형들 — 화면에 "무엇까지 인정되는지" 그대로 보여 준다.
export function recognitionKindsFor(record: LearningRecord): RecognitionKindId[] {
  const kinds: RecognitionKindId[] = [];
  if (canIssueLearningCertificate(record).eligible) kinds.push("learning_completed");
  if (record.understandingChecked) kinds.push("understanding_checked");
  if ((record.performanceNote ?? "").trim()) kinds.push("performance_done");
  if (validArtifacts(record).length > 0) kinds.push("artifact_linked");
  return kinds;
}

// 이 학습 기록만으로 도달 가능한 최대 증거등급.
// 영상 학습·퀴즈만 있으면 0을 반환한다 — 등급을 올리려면 수행·산출물이 필요하다.
export function maxTierFromRecord(record: LearningRecord): number {
  return recognitionKindsFor(record).reduce((max, id) => {
    const kind = findRecognitionKind(id);
    return kind ? Math.max(max, kind.maxTier) : max;
  }, 0);
}

// ── 증거 충족도 ────────────────────────────────────────────────────────────
// 이 서비스가 쓰는 유일한 비율 수치. "취업 가능성"이나 "적성"이 아니라,
// 목표 직무가 명시한 요구 증거 중 사용자가 확인한 항목의 비율일 뿐이다.
// 산정식과 근거를 항상 함께 공개한다(아래 formula/basis/disclaimer).

export type EvidenceCoverage = {
  requiredCount: number; // 목표 직무가 요구하는 증거 항목 수
  metCount: number; // 그중 확인된 증거로 충족된 항목 수
  percent: number; // metCount / requiredCount × 100 (정수)
  formula: string; // 산정식(화면에 그대로 표시)
  basis: string[]; // 충족으로 센 항목 이름
  unmet: string[]; // 아직 확인되지 않은 항목 이름
  disclaimer: string; // 채용 가능성이 아님을 명시
};

export const COVERAGE_DISCLAIMER =
  "증거 충족도는 목표 직무가 요구하는 증거 항목 중 확인된 항목의 비율입니다. 채용 가능성·합격 가능성·적성을 뜻하지 않습니다.";

// requiredItems: 목표 직무가 요구하는 증거 항목 이름
// metItems: 그중 사용자가 확인한 증거로 충족된 항목 이름
export function evidenceCoverage(requiredItems: string[], metItems: string[]): EvidenceCoverage {
  const required = requiredItems ?? [];
  const metSet = new Set(metItems ?? []);
  const basis = required.filter((item) => metSet.has(item));
  const unmet = required.filter((item) => !metSet.has(item));
  const requiredCount = required.length;
  const metCount = basis.length;
  return {
    requiredCount,
    metCount,
    percent: requiredCount === 0 ? 0 : Math.round((metCount / requiredCount) * 100),
    formula: `확인된 요구 증거 ${metCount}개 ÷ 목표 직무의 요구 증거 ${requiredCount}개 × 100`,
    basis,
    unmet,
    disclaimer: COVERAGE_DISCLAIMER,
  };
}

// 발급 문서 고유번호 — 사람이 읽을 수 있고 문서마다 구분된다.
// 난수를 쓰지 않는다(같은 입력이면 같은 번호 → 인쇄본 재발행 시에도 번호가 흔들리지 않는다).
export function certificateSerial(
  kind: CertificateKindId,
  record: LearningRecord,
  issuedAt: string,
): string {
  const prefix = kind === "learning" ? "L" : kind === "performance" ? "P" : "E";
  const basis = `${kind}|${record.competencyId}|${record.sourceTitle}|${issuedAt}`;
  let hash = 0;
  for (let i = 0; i < basis.length; i++) {
    hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
  }
  const datePart = issuedAt.replace(/[^0-9]/g, "").slice(0, 8);
  return `GP-${prefix}-${datePart}-${hash.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}
