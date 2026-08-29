// 인증 콜백이 내려보내는 Set-Cookie 문자열을 만든다.
//
// 왜 별도 모듈인가: 이 한 줄의 속성 조합이 틀리면 **로그인 자체가 조용히 실패한다.**
// 실제로 그런 일이 있었다 — 콜백이 모든 쿠키에 HttpOnly 를 강제로 붙였고,
// 그 결과 메일 확인 링크와 소셜 로그인으로 들어온 사용자는 세션이 정상적으로 만들어져도
// 화면에서는 계속 로그아웃 상태로 보였다. 오류도, 로그도 남지 않았다.
//
// 이유는 단순하다. 이 앱은 세션을 **브라우저에서** 읽는다(/profile 등은 클라이언트 컴포넌트가
// createBrowserClient 로 세션을 조회한다). 브라우저 클라이언트는 document.cookie 만 볼 수 있고,
// HttpOnly 쿠키는 document.cookie 에 나타나지 않는다.
//
// @supabase/ssr 도 같은 이유로 기본값을 httpOnly:false 로 못박아 두었다
// (node_modules/@supabase/ssr → utils/constants.js 의 DEFAULT_COOKIE_OPTIONS).
// 그래서 여기서는 **호출자가 명시적으로 요구할 때만** HttpOnly 를 붙인다.
//
// 보안 관점: 이것은 보호 수준을 낮추는 변경이 아니다. 비밀번호 로그인 경로는 이미
// createBrowserClient 가 document.cookie 로 같은 토큰을 non-HttpOnly 로 쓰고 있었다.
// 콜백만 홀로 달랐고, 그 불일치가 링크·소셜 경로를 망가뜨렸을 뿐이다.
// 실제 방어선은 그대로다 — RLS(supabase/migrations/0002~0005), 짧은 수명의 access token,
// SameSite=Lax, 그리고 https 에서의 Secure.

export type AuthCookieOptions = {
  path?: string;
  domain?: string;
  sameSite?: boolean | "lax" | "strict" | "none" | "Lax" | "Strict" | "None";
  maxAge?: number;
  expires?: Date | string | number;
  httpOnly?: boolean;
  secure?: boolean;
};

// cookie 규격의 SameSite 표기로 정규화한다. true 는 Strict 를 뜻한다(cookie 패키지와 동일).
function sameSiteAttribute(value: AuthCookieOptions["sameSite"]): string {
  if (value === undefined || value === null) return "Lax";
  if (value === true) return "Strict";
  if (value === false) return "";
  const normalized = String(value).toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "none") return "None";
  return "Lax";
}

// Expires 는 RFC 7231 IMF-fixdate 로만 내보낸다. 해석 불가능한 값이면 속성을 생략한다 —
// 깨진 날짜 문자열을 내보내면 브라우저가 쿠키 전체를 버릴 수 있다.
function expiresAttribute(value: AuthCookieOptions["expires"]): string {
  if (value === undefined || value === null) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toUTCString();
}

/**
 * @supabase/ssr 가 세션 쿠키에 쓰는 기본 수명(DEFAULT_COOKIE_OPTIONS.maxAge = 400일)과 같은 값.
 * refresh token 은 고정 만료가 없고 회전으로 관리되므로, 우리가 수명을 지어내는 대신
 * 라이브러리가 같은 쿠키에 주는 값을 그대로 쓴다.
 */
export const AUTH_COOKIE_FALLBACK_MAX_AGE = 400 * 24 * 60 * 60;

/**
 * 세션을 담는 쿠키가 만료 없이 나가면 브라우저 종료와 함께 로그인이 사라진다.
 * 라이브러리가 Max-Age 나 Expires 를 줬다면 그대로 두고(maxAge=0 삭제 지시 포함),
 * 둘 다 없을 때만 기본 수명을 채운다. 빈 값(삭제 쿠키)은 손대지 않는다.
 */
export function ensurePersistentAuthCookie(
  value: string,
  options: AuthCookieOptions | undefined,
): AuthCookieOptions | undefined {
  if (!value) return options;
  if (options?.maxAge !== undefined || options?.expires !== undefined) return options;
  return { ...options, maxAge: AUTH_COOKIE_FALLBACK_MAX_AGE };
}

/**
 * @param secure https 로 서비스되는가. 로컬 http 개발에서는 false 여야 쿠키가 저장된다.
 */
export function serializeAuthCookie(
  name: string,
  value: string,
  options: AuthCookieOptions | undefined,
  { secure }: { secure: boolean },
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options?.path ?? "/"}`);
  if (options?.domain) parts.push(`Domain=${options.domain}`);

  const sameSite = sameSiteAttribute(options?.sameSite);
  if (sameSite) parts.push(`SameSite=${sameSite}`);

  // 기본값은 "붙이지 않음"이다. 위 주석 참고 — 브라우저가 읽어야 하는 쿠키다.
  if (options?.httpOnly === true) parts.push("HttpOnly");

  if (secure || options?.secure === true) parts.push("Secure");

  // maxAge=0 은 PKCE verifier 를 지우라는 지시다. falsy 로 버리면 검증자가 남는다.
  if (options?.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);

  // 라이브러리가 Expires 로 만료를 전달하는 경우도 보존한다. 이전에는 이 속성이 조용히
  // 버려져, maxAge 없이 expires 만 오면 세션 쿠키가 됐다(브라우저 종료 = 로그아웃).
  const expires = expiresAttribute(options?.expires);
  if (expires) parts.push(`Expires=${expires}`);

  return parts.join("; ");
}

/** 로컬 http 개발에서는 Secure 를 붙이면 브라우저가 쿠키를 버린다. */
export function shouldMarkSecure(url: URL): boolean {
  const isLocalHttp =
    url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  return !isLocalHttp;
}
