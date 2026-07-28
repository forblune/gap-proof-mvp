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
  // 이 인정이 있을 때 넘지 못하는 증거등급 천장.
  // "이 인정만으로 저절로 도달한다" 는 뜻이 아니다 — 해당 역량에 사용자가 확인한 근거가
  // 이미 있어야 하고(maxTierFromRecord 의 hasConfirmedEvidence), 그 위에서의 상한이다.
  maxTier: number;
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

// 인정을 "누가 확인했는가"로 묶는다.
//
// 라벨만으로 신뢰도를 구분하면 결국 한 목록 안에서 나란히 놓이고, 사용자는
// 자기가 적은 것과 기관이 발급한 것을 같은 무게로 읽는다. Credly 는 반입 배지를
// 별도 섹션에 두고 transcript 에서 빼고, Europass 는 자기평가와 발급물을 다른
// 저장소에 둔다 — 규칙을 라벨이 아니라 구조로 강제한다.
// (조사 근거: docs/planning/BENCHMARK_AUDIT.md)
export type RecognitionGroupId = "self" | "artifact" | "external";

export type RecognitionGroup = {
  id: RecognitionGroupId;
  label: string;
  who: string; // 누가 확인한 것인가
  kinds: RecognitionKindId[];
};

export const RECOGNITION_GROUPS: RecognitionGroup[] = [
  {
    id: "self",
    label: "내가 기록한 것",
    who: "본인이 표시하거나 적은 내용입니다. GapProof가 사실 여부를 확인하지 않습니다.",
    kinds: ["learning_completed", "understanding_checked", "performance_done"],
  },
  {
    id: "artifact",
    label: "남아 있는 결과물",
    who: "누구나 링크를 열어 다시 확인할 수 있습니다. 품질은 평가하지 않습니다.",
    kinds: ["artifact_linked"],
  },
  {
    id: "external",
    label: "외부 기관이 발급한 것",
    who: "발급 주체가 GapProof가 아닙니다. 진위는 발급기관에서 확인해 주십시오.",
    kinds: ["external_credential", "third_party_reviewed"],
  },
];

export function recognitionGroupOf(id: RecognitionKindId): RecognitionGroupId {
  const group = RECOGNITION_GROUPS.find((candidate) => candidate.kinds.includes(id));
  // 그룹 없는 인정 유형은 만들지 않는다 — 만들면 어디에도 속하지 않은 채 화면에 새는다.
  if (!group) throw new Error(`recognition kind without group: ${id}`);
  return group.id;
}

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
      "그 역량에 확인된 근거가 이미 있고, 유효한 산출물 링크(http/https)가 연결된 경우. 수행 확인서 발급은 여기에 더해 수행 기록까지 요구한다(등급보다 문서 조건이 더 엄격하다).",
    neverWhen:
      "학습을 끝냈다는 사실이나 이해 확인(퀴즈) 통과로는 어떤 경우에도 오르지 않습니다. 이해 확인은 증거 강도 계산에 아예 반영되지 않습니다.",
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
    issuedFor: "본인이 표시한 학습 자료 완료와 필수 질문 응답 사실",
    requires: "본인이 표시한 학습 자료 완료 + 필수 질문 전체 응답(문항당 10자 이상)",
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

// 어디에 적어야 하고 어디에 적으면 안 되는지까지 문서가 직접 말한다.
// "공인 자격이 아니다"라는 고지만으로는 이 문서가 경력란에 적히는 것을 막지 못한다.
// (벤치마킹: Forage 인용 정책 — docs/planning/BENCHMARK_AUDIT.md)
export const CERTIFICATE_USAGE_NOTE = {
  allowed: "이력서·프로필의 '교육·수료' 또는 '자격' 항목에 적어 주십시오.",
  forbidden: "'경력'이나 '재직' 항목에는 적지 마십시오. 이 문서는 근무나 고용을 뜻하지 않습니다.",
  wording: "표기 예: GapProof 학습 기록 — {역량} ({발급일})",
} as const;

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
  // 자료를 끝까지 봤다고 사용자가 직접 표시한 값(자기기록, Lv.0).
  // 시스템이 시청을 측정하지는 않으므로 증서 문구도 "본인이 표시함"으로만 적는다.
  sourceCompleted: boolean;
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

// 응답 1건으로 인정하는 최소 길이. 한 글자짜리 답으로 증서가 나오지 않게 한다.
// 화면·판정·문서가 같은 값을 보도록 여기 한 곳에만 둔다.
export const MIN_ANSWER_CHARS = 10;

export function isAnsweredEnough(answer: string | undefined | null): boolean {
  return (answer ?? "").trim().length >= MIN_ANSWER_CHARS;
}

export function countAnswered(answers: readonly (string | undefined | null)[]): number {
  return answers.filter(isAnsweredEnough).length;
}

// 학습 수료증: 자료 완료를 본인이 표시하고 필수 질문에 전부(각 MIN_ANSWER_CHARS자 이상) 답했으면 발급 가능.
// 이해 확인(퀴즈) 통과는 요구하지 않는다 — 학습 수료증은 "봤다"는 사실만 말한다.
export function canIssueLearningCertificate(record: LearningRecord): IssueDecision {
  const missing: string[] = [];
  if (!record.sourceCompleted) {
    missing.push("학습 자료를 끝까지 봤다고 아직 표시하지 않았습니다.");
  }
  if (record.requiredQuestionCount <= 0) {
    missing.push("학습 질문이 아직 준비되지 않았습니다.");
  } else if (record.answeredQuestionCount < record.requiredQuestionCount) {
    const left = record.requiredQuestionCount - record.answeredQuestionCount;
    missing.push(`필수 질문 ${left}개에 아직 ${MIN_ANSWER_CHARS}자 이상 답하지 않았습니다.`);
  }
  return {
    eligible: missing.length === 0,
    missing,
    nextStep: missing.length === 0 ? null : !record.sourceCompleted ? "학습 자료를 끝까지 본 뒤 완료를 표시해 주십시오." : "학습 질문에 먼저 답해 주십시오.",
  };
}

// 증서에 인쇄되는 "확인 범위" — 실제로 검사한 조건만 적는다.
// 이 문자열과 위 판정 함수가 어긋나면 확인하지 않은 것을 확인했다고 인쇄하게 된다.
export function certificateScope(kind: "learning" | "performance"): string {
  const base = "본인이 표시한 학습 자료 완료 · 필수 질문 전체 응답";
  return kind === "performance" ? `${base} · 사용자가 남긴 수행 기록과 산출물 링크` : base;
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
  // 더 강한 주장을 하는 문서인데 학습 답변보다 문턱이 낮으면 안 된다("." 한 글자로 통과하던 문제).
  if (!isAnsweredEnough(record.performanceNote)) {
    missing.push(`무엇을 직접 해 봤는지 ${MIN_ANSWER_CHARS}자 이상 적어 주십시오.`);
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
  // 증서와 같은 문턱을 쓴다. 한 모듈이 같은 주장("실제 수행")에 두 기준을 두면
  // 화면에는 "인정됨 · 실제 수행"이 뜨는데 증서는 발급되지 않는 어긋남이 생긴다.
  if (isAnsweredEnough(record.performanceNote)) kinds.push("performance_done");
  if (validArtifacts(record).length > 0) kinds.push("artifact_linked");
  return kinds;
}

// 이 학습 기록만으로 도달 가능한 최대 증거등급.
//
// hasConfirmedEvidence: 이 역량에 사용자가 확인한 근거가 이미 있는지.
// 기획서 §6.2의 Lv.2 전제가 "그 역량에 확인된 근거가 이미 있고"이므로, 확인 증거가 없으면
// 수행 기록이나 산출물을 붙여도 Lv.1을 넘지 못한다 — 학습 기록 하나만으로 등급이
// 올라가는 것처럼 보이면 화면이 실제보다 큰 약속을 하게 된다.
// 영상 학습만으로 도달 가능한 상한.
//
// 이 값은 별도 분기로 집행하지 않는다 — 학습만 한 기록에 붙을 수 있는 인정
// (learning_completed, understanding_checked)의 maxTier 가 모두 0 이라 구조적으로 보장된다.
// 그 구조가 무너지면(누군가 maxTier 를 올리면) 테스트가 실패하도록 묶어 둔다.
export const LESSON_ONLY_MAX_TIER = 0;

export function maxTierFromRecord(record: LearningRecord, hasConfirmedEvidence = false): number {
  const raw = recognitionKindsFor(record).reduce((max, id) => {
    const kind = findRecognitionKind(id);
    return kind ? Math.max(max, kind.maxTier) : max;
  }, 0);

  // 영상 학습만 한 상태의 상한은 별도 분기로 집행하지 않는다.
  //
  // 그 상태에서 붙을 수 있는 인정은 learning_completed 와 understanding_checked 뿐이고
  // 둘 다 maxTier 0 이므로 raw 가 이미 0 이다. 분기를 두면 절대 실행되지 않는 코드가 되고,
  // 그것을 고정하려는 테스트는 원리상 실패할 수 없어 검증이 아니라 장식이 된다.
  // 대신 그 구조적 사실 자체를 테스트로 고정한다(LESSON_ONLY_MAX_TIER 참고).

  return hasConfirmedEvidence ? raw : Math.min(raw, 1);
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
// 요구 항목이 중복돼 있으면 하나만 채워도 두 번 세여 충족도가 조용히 부풀려진다.
export function evidenceCoverage(requiredItems: string[], metItems: string[]): EvidenceCoverage {
  // 같은 항목이 두 번 적혀 있으면 하나만 채워도 두 번 세여 비율이 부풀려진다.
  const required = [...new Set(requiredItems ?? [])];
  const metSet = new Set(metItems ?? []);
  const basis = required.filter((item) => metSet.has(item));
  const unmet = required.filter((item) => !metSet.has(item));
  const requiredCount = required.length;
  const metCount = basis.length;
  return {
    requiredCount,
    metCount,
    percent: requiredCount === 0 ? 0 : Math.round((metCount / requiredCount) * 100),
    formula: `링크가 연결된 확인 근거로 뒷받침된 요구 증거 ${metCount}개 ÷ 목표 직무의 요구 증거 ${requiredCount}개 × 100`,
    basis,
    unmet,
    disclaimer: COVERAGE_DISCLAIMER,
  };
}

// 발급 문서 고유번호 — 사람이 읽을 수 있고 문서마다 구분된다.
// 난수를 쓰지 않는다(같은 입력이면 같은 번호 → 인쇄본 재발행 시에도 번호가 흔들리지 않는다).
// ownerKey: 발급 대상을 구분하는 값(로그인 사용자 id, 비로그인은 기기 로컬 식별자).
// 이 값이 없으면 같은 날 같은 학습을 마친 서로 다른 사람이 같은 번호를 받게 되므로
// "고유번호"라는 표기가 거짓이 된다 — 그래서 필수 인자다.
export function certificateSerial(
  kind: CertificateKindId,
  record: LearningRecord,
  issuedAt: string,
  ownerKey: string,
): string {
  const prefix = kind === "learning" ? "L" : kind === "performance" ? "P" : "E";
  const basis = `${kind}|${ownerKey}|${record.competencyId}|${record.sourceTitle}|${issuedAt}`;
  let hash = 0;
  for (let i = 0; i < basis.length; i++) {
    hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
  }
  const datePart = issuedAt.replace(/[^0-9]/g, "").slice(0, 8);
  return `GP-${prefix}-${datePart}-${hash.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}
