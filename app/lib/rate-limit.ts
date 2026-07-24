// 남용 방지 (#7).
//
// 실제 Workers 런타임 정책 — fail-closed:
//   1차 수단은 Cloudflare Workers Rate Limiting API 바인딩(wrangler.jsonc의 ratelimits)이며,
//   바인딩 누락·호출 예외·예상 밖 응답이면 조용히 다른 수단으로 대체하지 않고
//   "unavailable"을 반환한다(라우트에서 503 + 외부 Solar 호출 금지).
//
// Node(테스트 하네스) 전용:
//   인메모리 카운터는 Node 단위 테스트에서만 쓰는 테스트 한정 어댑터다.
//   Workers 인스턴스별로 격리되는 구조라 운영 보안 수준의 한도가 아니며,
//   실제 Workers 런타임 분기에서는 절대 사용되지 않는다.

import { isWorkersRuntime, readServerBinding } from "./server-env";
import { GATE_COOKIE_NAME } from "./gate-session";

type RateLimiterBinding = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type RateLimitDecision = "allowed" | "limited" | "unavailable";

export const RATE_LIMIT_WINDOW_SECONDS = 60; // wrangler.jsonc simple.period와 일치(Retry-After 근거)
const LOCAL_TEST_LIMIT = 10; // wrangler.jsonc simple.limit과 동일 정책으로 테스트 재현

async function decideWithBinding(binding: unknown, key: string): Promise<RateLimitDecision> {
  if (!binding || typeof (binding as RateLimiterBinding).limit !== "function") {
    return "unavailable"; // 바인딩 누락
  }
  try {
    const result = await (binding as RateLimiterBinding).limit({ key });
    if (!result || typeof result.success !== "boolean") return "unavailable"; // 예상 밖 응답
    return result.success ? "allowed" : "limited";
  } catch {
    return "unavailable"; // 호출 예외
  }
}

// ── Node 테스트 전용 어댑터 ──────────────────────────────────────────────
// RATE_LIMIT_TEST_MODE는 Node 분기에서만 읽는다(실제 Workers 분기에서는 도달 불가).
// "binding-missing" / "binding-error"로 Workers 바인딩 실패 시나리오를 동일 코드 경로로 재현한다.
const localTestBuckets = new Map<string, { count: number; resetAt: number }>();

function nodeTestBinding(): unknown | "counter" {
  const mode = typeof process !== "undefined" ? process.env.RATE_LIMIT_TEST_MODE : undefined;
  if (mode === "binding-missing") return undefined;
  if (mode === "binding-error") {
    return { async limit() { throw new Error("simulated binding failure"); } };
  }
  return "counter";
}

function localTestCounter(bindingName: string, key: string): RateLimitDecision {
  const now = Date.now();
  const bucketKey = `${bindingName}:${key}`;
  const bucket = localTestBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    localTestBuckets.set(bucketKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 });
    return "allowed";
  }
  bucket.count += 1;
  return bucket.count <= LOCAL_TEST_LIMIT ? "allowed" : "limited";
}
// ────────────────────────────────────────────────────────────────────────

export async function checkRateLimit(bindingName: string, key: string): Promise<RateLimitDecision> {
  if (await isWorkersRuntime()) {
    // 실제 Workers: 바인딩 필수. 실패는 전부 fail-closed("unavailable").
    return decideWithBinding(await readServerBinding(bindingName), key);
  }
  const adapter = nodeTestBinding();
  if (adapter === "counter") return localTestCounter(bindingName, key);
  return decideWithBinding(adapter, key);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 제한 키(네임스페이스 구분):
//   ip:<normalized>       — Cloudflare 엣지가 설정하는 CF-Connecting-IP만 신뢰
//                           (X-Forwarded-For 등 사용자 제공 헤더는 사용하지 않음)
//   session:<digest16>    — 세션 토큰의 비가역 SHA-256 digest 앞 16자(고정 길이).
//                           원본 쿠키·서명 토큰을 키·로그에 그대로 쓰지 않는다.
//   anonymous:shared      — 둘 다 없는 요청의 공용 버킷
export async function clientKey(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) return `ip:${ip.trim().toLowerCase()}`;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${GATE_COOKIE_NAME}=([^;\\s]+)`));
  if (match) return `session:${(await sha256Hex(match[1])).slice(0, 16)}`;
  return "anonymous:shared";
}
