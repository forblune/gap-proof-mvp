// Workers 런타임 전용 내장 모듈의 최소 타입 선언.
// @cloudflare/workers-types 전체를 도입하지 않고, 이 저장소가 실제로 쓰는 표면만 선언한다.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
