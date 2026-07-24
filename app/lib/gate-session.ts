// 데모 접근 게이트 세션 (서버 전용).
// - 접근 코드·서명 비밀은 환경변수(GATE_ACCESS_CODE / GATE_SESSION_SECRET)로만 관리 — 소스에 값을 두지 않는다.
// - 세션은 HMAC-SHA256 서명 토큰을 HttpOnly 쿠키로 보관. 환경변수가 없으면 항상 거부(fail-closed).

import { readServerEnv } from "./server-env";

export const GATE_COOKIE_NAME = "gp_gate";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12시간 데모 세션
const TOKEN_VERSION = "v1";
const encoder = new TextEncoder();

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function verifyAccessCode(code: string): Promise<"ok" | "invalid" | "unconfigured"> {
  const expected = await readServerEnv("GATE_ACCESS_CODE");
  if (!expected) return "unconfigured"; // fail-closed
  return timingSafeEqual(code, expected) ? "ok" : "invalid";
}

// 쿠키 속성 규칙:
// - SameSite=Lax: 카카오톡·검색 등 외부에서의 최상위 이동에서도 기존 데모 세션을 사용 가능해야 함.
// - Secure: 운영(HTTPS)에서는 필수. localhost/127.0.0.1의 HTTP 개발 환경에서만 생략.
//   판단 근거는 서버가 신뢰할 수 있는 요청 URL(protocol/hostname)이며, 사용자 입력 헤더를 믿지 않는다.
function cookieAttributes(request: Request, maxAge: number): string {
  const url = new URL(request.url);
  const isLocalHttp =
    url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  return `Max-Age=${maxAge}; Path=/; HttpOnly${isLocalHttp ? "" : "; Secure"}; SameSite=Lax`;
}

export async function createGateCookie(request: Request): Promise<string | null> {
  const secret = await readServerEnv("GATE_SESSION_SECRET");
  if (!secret) return null; // fail-closed
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${TOKEN_VERSION}.${expires}`;
  const token = `${payload}.${await hmacHex(secret, payload)}`;
  return `${GATE_COOKIE_NAME}=${token}; ${cookieAttributes(request, SESSION_TTL_SECONDS)}`;
}

// 데모 잠금(로그아웃): 쿠키 즉시 만료
export function clearGateCookie(request: Request): string {
  return `${GATE_COOKIE_NAME}=; ${cookieAttributes(request, 0)}`;
}

export async function verifyGateSession(request: Request): Promise<boolean> {
  const secret = await readServerEnv("GATE_SESSION_SECRET");
  if (!secret) return false; // fail-closed: 서명 비밀이 없으면 어떤 세션도 인정하지 않음
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)gp_gate=([^;\s]+)/);
  if (!match) return false;
  const [version, expiresPart, signature] = match[1].split(".");
  if (version !== TOKEN_VERSION || !expiresPart || !signature) return false;
  const expires = Number(expiresPart);
  if (!Number.isInteger(expires) || expires * 1000 < Date.now()) return false;
  const expected = await hmacHex(secret, `${TOKEN_VERSION}.${expiresPart}`);
  return timingSafeEqual(expected, signature);
}
