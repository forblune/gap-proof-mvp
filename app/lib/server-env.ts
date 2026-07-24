// 서버 전용 환경변수 판독.
// Cloudflare Workers 런타임에서는 process.env에 시크릿이 주입되지 않을 수 있으므로(#16에서 실측),
// cloudflare:workers의 env 바인딩을 우선 읽고, Node 실행(빌드 산출물 테스트 하네스)에서는 process.env로 폴백한다.

let cachedWorkersEnv: Record<string, unknown> | null | undefined;

async function workersEnv(): Promise<Record<string, unknown> | null> {
  if (cachedWorkersEnv !== undefined) return cachedWorkersEnv;
  try {
    const mod = (await import(/* @vite-ignore */ "cloudflare:workers")) as { env?: Record<string, unknown> };
    cachedWorkersEnv = mod.env ?? null;
  } catch {
    // Node 등 Workers 밖 런타임: 모듈이 없으므로 process.env 폴백 사용
    cachedWorkersEnv = null;
  }
  return cachedWorkersEnv;
}

// 문자열이 아닌 바인딩(rate limiter 등)은 Workers env에서만 존재한다. Node에서는 undefined.
export async function readServerBinding(key: string): Promise<unknown> {
  return (await workersEnv())?.[key];
}

export async function readServerEnv(key: string): Promise<string | undefined> {
  const binding = (await workersEnv())?.[key];
  if (typeof binding === "string" && binding.length > 0) return binding;
  try {
    const value = typeof process !== "undefined" && process.env ? process.env[key] : undefined;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}
