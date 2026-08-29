// 콜백 라우트 통합 테스트 — 실제 GET 핸들러를 실행한다.
//
// 왜 단위 테스트로 부족한가: 운영 P0 검증에서 "확인 링크로 만든 세션이 브라우저 종료 후
// 사라진다"가 보고됐다. 직렬화기 단위 테스트는 전부 통과하는 상태였다 — 문제는 항상
// 라이브러리가 setAll 로 **실제로 무엇을 넘기는가**와 그 결과가 **와이어에 어떻게 나가는가**
// 사이에 있다. 그래서 Supabase 토큰 엔드포인트만 스텁하고 @supabase/ssr, auth-js,
// 라우트 코드를 전부 진짜로 돌린 뒤, 응답의 Set-Cookie 를 그대로 검사한다.
//
// 합성 값만 쓴다. 실제 프로젝트·계정·토큰은 등장하지 않는다.
import { register } from "node:module";
import test from "node:test";
import assert from "node:assert/strict";

// 앱 라우트는 확장자 없는 상대 import 를 쓴다(vite 해석). node 용 리졸버를 먼저 건다.
register(new URL("./helpers/resolve-ts.mjs", import.meta.url));

// 공개 설정은 모듈 로드 시점에 캡처되므로 route import 전에 넣어야 한다. 값은 합성이다.
const REF = "testref1234567890ab";
process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${REF}.supabase.co`;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_test_only";

const { GET } = await import("../app/auth/callback/route.ts");

const AUTH_COOKIE = `sb-${REF}-auth-token`;
// auth-js 는 verifier 를 JSON 으로 저장한다(getItemAsync 가 JSON.parse 한다).
const VERIFIER_COOKIE = `${AUTH_COOKIE}-code-verifier=${encodeURIComponent('"local-test-verifier"')}`;

function fakeSessionJson() {
  const now = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    access_token: "header.payload.signature",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "local-test-refresh",
    user: {
      id: "00000000-0000-4000-8000-000000000000",
      aud: "authenticated",
      role: "authenticated",
      email: "local-test@example.invalid",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    },
  });
}

/** 토큰 교환 엔드포인트만 스텁한다. exchangeOk=false 면 교환이 400 으로 실패한다. */
function stubTokenEndpoint({ exchangeOk }) {
  globalThis.fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("/auth/v1/token")) {
      return exchangeOk
        ? new Response(fakeSessionJson(), { status: 200, headers: { "content-type": "application/json" } })
        : new Response(JSON.stringify({ error: "invalid_grant", error_description: "synthetic failure" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
}

function callbackRequest(origin, next = "/profile") {
  const url = `${origin}/auth/callback?code=local-test-code&next=${encodeURIComponent(next)}`;
  return new Request(url, { headers: { cookie: VERIFIER_COOKIE } });
}

/** Set-Cookie 한 줄을 이름/값/속성으로 나눈다. */
function parseSetCookie(line) {
  const [pair, ...attrs] = line.split("; ");
  const eq = pair.indexOf("=");
  const lower = attrs.map((a) => a.toLowerCase());
  const get = (prefix) => {
    const hit = attrs.find((a) => a.toLowerCase().startsWith(prefix));
    return hit ? hit.slice(hit.indexOf("=") + 1) : undefined;
  };
  return {
    name: pair.slice(0, eq),
    value: pair.slice(eq + 1),
    maxAge: get("max-age=") === undefined ? undefined : Number(get("max-age=")),
    expires: get("expires="),
    secure: lower.includes("secure"),
    httpOnly: lower.includes("httponly"),
    sameSite: get("samesite="),
    path: get("path="),
  };
}

/** 브라우저 재시작을 모사한다: 만료가 있는(살아 있는) 쿠키만 다음 요청으로 넘어간다. */
function survivesRestart(cookie) {
  if (cookie.maxAge !== undefined) return cookie.maxAge > 0;
  if (cookie.expires !== undefined) return new Date(cookie.expires).getTime() > Date.now();
  return false; // 세션 쿠키 — 브라우저 종료와 함께 사라진다
}

test("교환 성공: 세션 쿠키가 만료를 갖고 나간다 — 재시작 복원의 전제", async () => {
  stubTokenEndpoint({ exchangeOk: true });
  const response = await GET(callbackRequest("https://gapproof.example.com"));

  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get("location")).pathname, "/profile");

  const cookies = response.headers.getSetCookie().map(parseSetCookie);
  const session = cookies.find((c) => c.name === AUTH_COOKIE);
  assert.ok(session, `세션 쿠키(${AUTH_COOKIE})가 없다: ${cookies.map((c) => c.name).join(", ")}`);

  // 핵심 속성: 만료가 반드시 있어야 한다. 없으면 브라우저 종료 = 로그아웃.
  assert.ok(
    (session.maxAge !== undefined && session.maxAge > 0) || session.expires !== undefined,
    `세션 쿠키에 Max-Age/Expires 가 없다 — 세션 쿠키로 나가고 있다`,
  );
  // 나머지 속성 계약(#88 포함): 브라우저가 읽어야 하므로 HttpOnly 금지.
  assert.equal(session.httpOnly, false, "HttpOnly 가 붙으면 로그인이 조용히 실패한다");
  assert.equal(session.secure, true, "https 콜백은 Secure 여야 한다");
  assert.equal(session.sameSite?.toLowerCase(), "lax");
  assert.equal(session.path, "/");
});

test("교환 성공: PKCE verifier 는 즉시 삭제된다(Max-Age=0)", async () => {
  stubTokenEndpoint({ exchangeOk: true });
  const response = await GET(callbackRequest("https://gapproof.example.com"));
  const verifier = response.headers.getSetCookie().map(parseSetCookie)
    .find((c) => c.name.endsWith("-code-verifier"));
  assert.ok(verifier, "verifier 삭제 쿠키가 없다");
  assert.equal(verifier.maxAge, 0, "verifier 는 Max-Age=0 으로 지워져야 한다");
});

test("브라우저 재시작 모사: 세션 쿠키는 살아남고 verifier 는 사라진다", async () => {
  stubTokenEndpoint({ exchangeOk: true });
  const response = await GET(callbackRequest("https://gapproof.example.com"));
  const cookies = response.headers.getSetCookie().map(parseSetCookie);

  const surviving = cookies.filter(survivesRestart);
  assert.ok(surviving.some((c) => c.name === AUTH_COOKIE), "재시작 후 세션 쿠키가 남지 않는다");
  assert.ok(!surviving.some((c) => c.name.endsWith("-code-verifier")), "verifier 가 재시작을 살아남으면 안 된다");

  // 살아남은 쿠키로 다음 요청 헤더를 만들 수 있어야 한다(값 왕복 확인).
  const header = surviving.map((c) => `${c.name}=${c.value}`).join("; ");
  assert.ok(header.includes(`${AUTH_COOKIE}=`));
});

test("로컬 http 개발: Secure 를 붙이지 않아 쿠키가 저장된다", async () => {
  stubTokenEndpoint({ exchangeOk: true });
  const response = await GET(callbackRequest("http://localhost:3000"));
  const session = response.headers.getSetCookie().map(parseSetCookie)
    .find((c) => c.name === AUTH_COOKIE);
  assert.ok(session);
  assert.equal(session.secure, false, "로컬 http 에 Secure 가 붙으면 브라우저가 쿠키를 버린다");
  // 만료 계약은 로컬에서도 같다.
  assert.ok((session.maxAge !== undefined && session.maxAge > 0) || session.expires !== undefined);
});

test("교환 실패: 세션 쿠키 없이 로그인으로 되돌린다", async () => {
  stubTokenEndpoint({ exchangeOk: false });
  const response = await GET(callbackRequest("https://gapproof.example.com"));
  assert.equal(response.status, 303);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("auth"), "exchange_failed");
  assert.equal(response.headers.getSetCookie().length, 0, "실패 경로에서 쿠키를 내려보내면 안 된다");
});

test("redirect guard 회귀 없음: 외부 next 는 우리 origin 을 벗어나지 못한다", async () => {
  stubTokenEndpoint({ exchangeOk: true });
  const origin = "https://gapproof.example.com";
  for (const bad of ["https://evil.example.com", "//evil.example.com", "\\\\evil.example.com", "/\\evil.example.com"]) {
    const response = await GET(callbackRequest(origin, bad));
    const location = new URL(response.headers.get("location"));
    assert.equal(location.origin, origin, `next=${bad} 가 외부로 나갔다`);
  }
});
