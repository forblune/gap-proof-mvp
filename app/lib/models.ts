// Solar 모델 allowlist (#8).
// 서버(analyze)가 이 목록만 허용하고, 클라이언트 선택 UI도 같은 목록을 사용한다(단일 출처).
// 공개 가능한 UI 데이터만 있으며 API 키·내부 설정은 포함하지 않는다.

export type SolarModelOption = { id: string; label: string; description: string };

export const SOLAR_MODELS: SolarModelOption[] = [
  { id: "solar-pro3", label: "Pro 3", description: "가장 똑똑한 최신 Solar 모델 (기본)" },
  { id: "solar-pro2", label: "Pro 2", description: "이전 세대 Solar 플래그십 모델" },
  { id: "solar-mini", label: "Mini", description: "빠르고 가벼운 Solar 경량 모델" },
];

export const DEFAULT_MODEL_ID = "solar-pro3";

export function isAllowedModel(id: string): boolean {
  return SOLAR_MODELS.some((model) => model.id === id);
}
