// 남용 방지 (#7).
// 1차 수단: Cloudflare Workers Rate Limiting API 바인딩(wrangler.jsonc의 ratelimits) —
//   엣지 실행 환경에서 유효한 한도. miniflare가 로컬 dev에서도 에뮬레이션한다.
// 보조 수단: 바인딩이 없는 런타임(Node 테스트 하네스 등)의 인스턴스-로컬 카운터.
//   Workers 인스턴스별로 격리되므로 이것만으로 운영급 한도라고 주장하지 않는다.

import { readServerBinding } from "./server-env";
import { GATE_COOKIE_NAME } from "./gate-session";

type RateLimiterBinding = { limit(options: { key: string }): Promise<{ success: boolean }> };

const LOCAL_LIMIT = 10;
const LOCAL_PERIOD_MS = 60_000;
const localBuckets = new Map<string, { count: number; resetAt: number }>();

export async function allowRequest(bindingName: string, key: string): Promise<boolean> {
  const binding = (await readServerBinding(bindingName)) as RateLimiterBinding | undefined;
  if (binding && typeof binding.limit === "function") {
    try {
      return (await binding.limit({ key })).success;
    } catch {
      // 바인딩 오류 시 보조 카운터로 계속 제한한다 (fail-open 방지)
    }
  }
  const now = Date.now();
  const bucketKey = `${bindingName}:${key}`;
  const bucket = localBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    localBuckets.set(bucketKey, { count: 1, resetAt: now + LOCAL_PERIOD_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= LOCAL_LIMIT;
}

// 제한 키: Cloudflare 엣지가 설정하는 CF-Connecting-IP 우선(엣지 뒤에서 신뢰 가능),
// 없으면 게이트 세션 토큰 꼬리, 둘 다 없으면 공용 버킷.
export function clientKey(request: Request): string {
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) return `ip:${ip}`;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${GATE_COOKIE_NAME}=([^;\\s]+)`));
  if (match) return `tok:${match[1].slice(-24)}`;
  return "anon";
}
