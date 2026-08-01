// Workers 런타임 전용 내장 모듈의 최소 타입 선언.
// @cloudflare/workers-types 전체를 도입하지 않고, 이 저장소가 실제로 쓰는 표면만 선언한다.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}

// worker/index.ts 의 Env 바인딩이 참조하는 전역 타입. 선언이 없어 `npm run build` 는 통과하지만
// `tsc --noEmit` 만 TS2304 로 실패하고 있었다(빌드는 타입을 보지 않는다).
// 여기서도 @cloudflare/workers-types 전체를 들이지 않고 실제로 쓰는 표면만 선언한다.

/** ASSETS 바인딩. worker/index.ts 는 fetch() 하나만 쓴다. */
interface Fetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

// D1Database 는 여기서 선언하지 않는다. 전역으로 만들면 drizzle-orm/d1 이 참조하는 이름까지
// 이 선언으로 덮여 db/index.ts 의 drizzle(env.DB) 가 타입 오류가 된다. worker/index.ts 는
// DB 바인딩을 전달만 하므로 그쪽에서 구조를 특정하지 않는 편이 맞다.
