// Gate 1 (#35): 진행 상태 draft — 이 기기의 localStorage에만 저장한다.
// 목적: 세션 만료·인앱 브라우저 재시작 뒤 재인증하면 원래 단계·입력·확인 상태로 복귀.
// 원칙: 개인 입력을 URL·서버로 보내지 않는다. 잠금·삭제(새 분석 시작) 시 draft를 지운다.
// 구조가 조금이라도 어긋난 draft는 복원하지 않는다(null) — 깨진 상태로 화면을 오염시키지 않기 위해서다.

export const DRAFT_KEY = "gp_draft_v1";
// 입력 상한 확장(Gate 3, 10,000자)을 대비한 검증 여유 상한
export const DRAFT_MAX_EXPERIENCE = 20_000;
const MAX_CLAIMS = 50;
const MAX_CHECK_KEYS = 100;

export type DraftClaim = {
  id: number;
  skill: string;
  quote: string;
  source: string;
  tier: number;
  confidence: "높음" | "확인 필요";
  question: string;
  status: "pending" | "confirmed" | "rejected";
  link?: string;
};

export type DraftV1 = {
  v: 1;
  savedAt: string;
  step: number;
  storeConsent: boolean;
  aggregateConsent: boolean;
  experience: string;
  claims: DraftClaim[];
  roleId: string;
  passedChecks: Record<string, boolean>;
  analysisSource: "idle" | "solar" | "sample";
  analysisModel: string | null;
  modelId: string;
  analysisNotice: string;
  selectedAction: string;
  proofDate: string | null;
};

const CONFIDENCE = new Set(["높음", "확인 필요"]);
const STATUS = new Set(["pending", "confirmed", "rejected"]);
const SOURCE = new Set(["idle", "solar", "sample"]);

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isClaim(x: unknown): x is DraftClaim {
  if (!isRecord(x)) return false;
  return (
    Number.isInteger(x.id) &&
    typeof x.skill === "string" &&
    typeof x.quote === "string" &&
    typeof x.source === "string" &&
    Number.isInteger(x.tier) &&
    typeof x.confidence === "string" && CONFIDENCE.has(x.confidence) &&
    typeof x.question === "string" &&
    typeof x.status === "string" && STATUS.has(x.status) &&
    (x.link === undefined || typeof x.link === "string")
  );
}

export function serializeDraft(data: Omit<DraftV1, "v" | "savedAt">, savedAt: string): string {
  return JSON.stringify({ v: 1, savedAt, ...data });
}

export function parseDraft(raw: string | null | undefined): DraftV1 | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const d = parsed;
  if (d.v !== 1) return null;
  if (typeof d.savedAt !== "string") return null;
  if (!Number.isInteger(d.step) || (d.step as number) < 0 || (d.step as number) > 4) return null;
  if (typeof d.storeConsent !== "boolean" || typeof d.aggregateConsent !== "boolean") return null;
  if (typeof d.experience !== "string" || d.experience.length > DRAFT_MAX_EXPERIENCE) return null;
  if (!Array.isArray(d.claims) || d.claims.length > MAX_CLAIMS || !d.claims.every(isClaim)) return null;
  if (typeof d.roleId !== "string") return null;
  if (!isRecord(d.passedChecks)) return null;
  const checkEntries = Object.entries(d.passedChecks);
  if (checkEntries.length > MAX_CHECK_KEYS || checkEntries.some(([, v]) => typeof v !== "boolean")) return null;
  if (typeof d.analysisSource !== "string" || !SOURCE.has(d.analysisSource)) return null;
  if (d.analysisModel !== null && typeof d.analysisModel !== "string") return null;
  if (typeof d.modelId !== "string") return null;
  if (typeof d.analysisNotice !== "string") return null;
  if (typeof d.selectedAction !== "string") return null;
  if (d.proofDate !== null && typeof d.proofDate !== "string") return null;
  return d as unknown as DraftV1;
}

export function loadDraft(storage: Pick<Storage, "getItem">): DraftV1 | null {
  try {
    return parseDraft(storage.getItem(DRAFT_KEY));
  } catch {
    return null; // 프라이빗 모드 등 접근 불가 — 복원 없이 진행
  }
}

export function saveDraft(storage: Pick<Storage, "setItem">, data: Omit<DraftV1, "v" | "savedAt">, savedAt: string): void {
  try {
    storage.setItem(DRAFT_KEY, serializeDraft(data, savedAt));
  } catch {
    // 저장 불가(quota·프라이빗 모드) — 기능은 계속 동작하고 복원만 안 될 뿐이다
  }
}

export function clearDraft(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // 접근 불가 시 무시
  }
}
