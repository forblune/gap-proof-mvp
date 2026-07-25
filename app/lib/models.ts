// Solar 모델 allowlist (#8) + 상세 카드 데이터 (Gate 5 #41).
// 서버(analyze)가 이 목록만 허용하고, 클라이언트 선택 UI도 같은 목록을 사용한다(단일 출처).
// 공개 가능한 UI 데이터만 있으며 API 키·내부 설정은 포함하지 않는다.
//
// 출처 구분 원칙(#41): official=Upstage 공식 소개 기반 표현 / internal=GapProof 자체 관찰.
// 자체적으로 검증하지 않은 항목은 "평가 중"으로 두고 장점을 만들어내지 않는다.

export type SolarModelOption = {
  id: string;
  label: string;
  fullName: string;
  description: string;
  badge: "기본·추천" | "안정형" | "빠른 초안";
  // [공식] Upstage 공식 소개에 기반한 포지셔닝
  officialNote: string;
  // [공식] 잘 맞는 입력
  goodFor: string;
  // [자체] 상대 속도 체감 — 검증 전이면 "평가 중"
  relativeSpeed: string;
  // [자체] 긴 글(수천 자) 적합성 — 검증 전이면 "평가 중"
  longText: string;
  // [자체] 원문 근거 추출 품질 — 검증 전이면 "평가 중"
  evidenceExtraction: string;
  // 제한·주의
  caution: string;
};

export const SOLAR_MODELS: SolarModelOption[] = [
  {
    id: "solar-pro3",
    label: "Pro 3",
    fullName: "Solar Pro 3",
    description: "복잡한 분석에 적합한 최신 모델 (기본)",
    badge: "기본·추천",
    officialNote: "Upstage의 최신 플래그십 모델이에요.",
    goodFor: "여러 경험이 섞인 길고 복잡한 서술",
    relativeSpeed: "보통 (평가 중 — 운영 측정 전)",
    longText: "장문 처리 대상 기본 모델 (평가 중)",
    evidenceExtraction: "평가 중 (운영 데이터 수집 전)",
    caution: "응답이 Mini보다 느릴 수 있어요.",
  },
  {
    id: "solar-pro2",
    label: "Pro 2",
    fullName: "Solar Pro 2",
    description: "안정적인 고성능 모델",
    badge: "안정형",
    officialNote: "검증 기간이 긴 고성능 모델이에요.",
    goodFor: "일반적인 길이의 경험 서술",
    relativeSpeed: "보통 (평가 중)",
    longText: "평가 중",
    evidenceExtraction: "평가 중",
    caution: "최신 기능 반영은 Pro 3보다 늦을 수 있어요.",
  },
  {
    id: "solar-mini",
    label: "Mini",
    fullName: "Solar Mini",
    description: "빠르고 가벼운 분석용 모델",
    badge: "빠른 초안",
    officialNote: "가볍고 빠른 응답에 초점을 둔 모델이에요.",
    goodFor: "짧은 서술을 빠르게 훑어보고 싶을 때",
    relativeSpeed: "빠른 편 (공식 포지셔닝 기준)",
    longText: "긴 글에서는 후보를 놓칠 수 있어요 (평가 중)",
    evidenceExtraction: "평가 중",
    caution: "복잡한 경험에서는 Pro 계열보다 단순한 결과가 나올 수 있어요.",
  },
];

export const DEFAULT_MODEL_ID = "solar-pro3";

export function isAllowedModel(id: string): boolean {
  return SOLAR_MODELS.some((model) => model.id === id);
}

export function findModel(id: string): SolarModelOption {
  return SOLAR_MODELS.find((model) => model.id === id) ?? SOLAR_MODELS[0];
}
