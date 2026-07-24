// Solar 모델 allowlist (#8).
// 서버(analyze)가 이 목록만 허용하고, 클라이언트 선택 UI도 같은 목록을 사용한다(단일 출처).
// 공개 가능한 UI 데이터만 있으며 API 키·내부 설정은 포함하지 않는다.

export type SolarModelOption = { id: string; label: string; description: string };

// 설명은 중립적으로 유지한다(특정 모델이 항상 더 좋은 결과를 보장한다고 표현하지 않음).
export const SOLAR_MODELS: SolarModelOption[] = [
  { id: "solar-pro3", label: "Pro 3", description: "복잡한 분석에 적합한 최신 모델 (기본)" },
  { id: "solar-pro2", label: "Pro 2", description: "안정적인 고성능 모델" },
  { id: "solar-mini", label: "Mini", description: "빠르고 가벼운 분석용 모델" },
];

export const DEFAULT_MODEL_ID = "solar-pro3";

export function isAllowedModel(id: string): boolean {
  return SOLAR_MODELS.some((model) => model.id === id);
}
