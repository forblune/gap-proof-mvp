// 콜백 리다이렉트 대상 검증 — 열린 리다이렉트(CWE-601) 회귀 방지.
// 심사에서 "/\evil.com" 이 https://evil.com/ 으로 해석돼 통과하던 결함이 발견됐다.
import test from "node:test";
import assert from "node:assert/strict";
import { parse as parseCookie } from "cookie";
import { safeNext } from "../app/lib/safe-redirect.ts";
import { serializeAuthCookie, shouldMarkSecure } from "../app/lib/auth-cookie.ts";

const ORIGIN = "https://gapproof.example.com";

test("같은 사이트 상대 경로는 그대로 통과한다", () => {
  assert.equal(safeNext("/profile", ORIGIN), "/profile");
  assert.equal(safeNext("/demo?sample=1", ORIGIN), "/demo?sample=1");
  assert.equal(safeNext("/a/b#c", ORIGIN), "/a/b#c");
});

test("절대 URL·프로토콜 상대 경로는 거부한다", () => {
  assert.equal(safeNext("https://evil.com/x", ORIGIN), "/profile");
  assert.equal(safeNext("http://evil.com", ORIGIN), "/profile");
  assert.equal(safeNext("//evil.com/x", ORIGIN), "/profile");
});

test("dot-segment 우회를 거부한다 — 반환값이 다시 해석돼 //evil.com 이 되는 경로", () => {
  for (const attempt of ["/..//evil.com", "/.//evil.com", "/a/../..//evil.com", "/x/..//evil.com/y"]) {
    const result = safeNext(attempt, ORIGIN);
    assert.equal(new URL(result, ORIGIN).origin, ORIGIN, `${attempt} → ${result} 가 외부로 나간다`);
    assert.ok(!result.startsWith("//"), `${attempt} → ${result} 가 프로토콜 상대 경로다`);
  }
});

test("역슬래시 우회를 거부한다 — WHATWG URL은 \\ 를 / 와 같게 취급한다", () => {
  for (const attempt of ["/\\evil.com", "/\\\\evil.com", "\\/evil.com", "/a\\b", "\\\\evil.com"]) {
    const result = safeNext(attempt, ORIGIN);
    assert.equal(result, "/profile", `${attempt} 를 통과시켰다`);
    // 결과를 실제로 해석해도 우리 origin 을 벗어나지 않아야 한다.
    assert.equal(new URL(result, ORIGIN).origin, ORIGIN);
  }
});

test("어떤 입력이든 결과는 항상 우리 origin 안에 머문다", () => {
  const attempts = [
    null, "", "   ", "javascript:alert(1)", "data:text/html,x",
    "https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com",
    "/legit", "/legit?a=1", "///evil.com", "/%2F%2Fevil.com",
    "/..//evil.com", "/.//evil.com", "/a/../..//evil.com", "/x/..//evil.com/y",
  ];
  for (const attempt of attempts) {
    const result = safeNext(attempt, ORIGIN);
    assert.ok(result.startsWith("/"), `${attempt} → ${result} 가 상대 경로가 아니다`);
    assert.equal(new URL(result, ORIGIN).origin, ORIGIN, `${attempt} → ${result} 가 외부로 나간다`);
  }
});

test("빈 값이면 안전한 기본 경로를 쓴다", () => {
  assert.equal(safeNext(null, ORIGIN), "/profile");
  assert.equal(safeNext("", ORIGIN), "/profile");
});

// ── 콜백이 내려보내는 쿠키 ────────────────────────────────────────────────────
// 운영 사고: 콜백이 모든 쿠키에 HttpOnly 를 강제해 메일 확인 링크·소셜 로그인으로 들어온
// 사용자의 세션이 브라우저에 보이지 않았다. 이 앱은 세션을 클라이언트 컴포넌트에서 읽는다.
// 오류도 로그도 남지 않는 실패라 테스트로 고정한다.

const AUTH_COOKIE = `sb-${"a".repeat(20)}-auth-token`;
// @supabase/ssr 의 createServerClient 가 setAll 로 넘겨 주는 실제 기본값.
const SSR_DEFAULTS = { path: "/", sameSite: "lax", httpOnly: false, maxAge: 400 * 24 * 60 * 60 };

test("인증 쿠키에 HttpOnly 를 붙이지 않는다 — 브라우저 클라이언트가 읽어야 한다", () => {
  const header = serializeAuthCookie(AUTH_COOKIE, "token-value", SSR_DEFAULTS, { secure: true });
  assert.ok(!/HttpOnly/i.test(header), `HttpOnly 가 붙었다: ${header}`);
});

test("호출자가 명시적으로 요구하면 HttpOnly 를 붙인다", () => {
  const header = serializeAuthCookie("x", "y", { ...SSR_DEFAULTS, httpOnly: true }, { secure: true });
  assert.match(header, /(^|; )HttpOnly(;|$)/);
});

test("https 에서는 Secure, 로컬 http 에서는 붙이지 않는다", () => {
  assert.match(serializeAuthCookie("x", "y", SSR_DEFAULTS, { secure: true }), /(^|; )Secure(;|$)/);
  assert.ok(!/Secure/.test(serializeAuthCookie("x", "y", SSR_DEFAULTS, { secure: false })));

  assert.equal(shouldMarkSecure(new URL("https://gapproof.example.com/auth/callback")), true);
  assert.equal(shouldMarkSecure(new URL("http://localhost:3000/auth/callback")), false);
  assert.equal(shouldMarkSecure(new URL("http://127.0.0.1:3000/auth/callback")), false);
  // 로컬이 아닌 http 는 예외로 봐주지 않는다.
  assert.equal(shouldMarkSecure(new URL("http://evil.example.com/auth/callback")), true);
});

test("maxAge=0 을 보존한다 — PKCE verifier 삭제 지시다", () => {
  const header = serializeAuthCookie("verifier", "", { ...SSR_DEFAULTS, maxAge: 0 }, { secure: true });
  assert.match(header, /(^|; )Max-Age=0(;|$)/);
});

test("기본 Path 와 SameSite 를 채운다", () => {
  const header = serializeAuthCookie("x", "y", undefined, { secure: true });
  assert.match(header, /(^|; )Path=\/(;|$)/);
  assert.match(header, /(^|; )SameSite=Lax(;|$)/);
});

test("브라우저 클라이언트가 쓰는 파서로 값이 그대로 복원된다", () => {
  // createBrowserClient 는 cookie 패키지의 parse 로 document.cookie 를 읽는다.
  // 서버가 쓴 값이 그 파서를 통과해 원래대로 나와야 세션이 이어진다.
  const value = 'base64-chunk_0.eyJhIjoiYiJ9; weird="quoted",value';
  const header = serializeAuthCookie(AUTH_COOKIE, value, SSR_DEFAULTS, { secure: true });
  const [pair] = header.split("; ");
  assert.equal(parseCookie(pair)[AUTH_COOKIE], value);
});
