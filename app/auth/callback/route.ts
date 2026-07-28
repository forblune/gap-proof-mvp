// OAuth / 이메일 링크 콜백 — 서버 라우트.
//
// 보안 규칙:
//  - publishable 키만 쓴다. service role 키와 provider client secret은 이 경로에 존재하지 않는다
//    (코드↔토큰 교환은 Supabase가 수행한다).
//  - next 파라미터는 같은 사이트의 상대 경로만 허용한다. 열린 리다이렉트는 계정 탈취 경로가 된다.
//  - 실패를 조용히 성공처럼 넘기지 않는다. 이유를 쿼리로 실어 로그인 화면이 사용자에게 설명한다.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "../../lib/supabase";
import { safeNext } from "../../lib/safe-redirect";


function redirect(origin: string, path: string, cookies: string[]): Response {
  const headers = new Headers({ location: new URL(path, origin).toString(), "cache-control": "no-store" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), url.origin);

  // 사용자가 외부 인증 화면에서 취소했거나 provider가 오류를 돌려준 경우.
  const providerError = url.searchParams.get("error");
  if (providerError) {
    const reason = providerError === "access_denied" ? "cancelled" : "provider_error";
    return redirect(url.origin, `/login?auth=${reason}`, []);
  }

  const code = url.searchParams.get("code");
  if (!code) return redirect(url.origin, "/login?auth=missing_code", []);

  if (!isSupabaseConfigured()) return redirect(url.origin, "/login?auth=unconfigured", []);

  const setCookies: string[] = [];
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        const header = request.headers.get("cookie") ?? "";
        return header
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const index = part.indexOf("=");
            return { name: part.slice(0, index), value: decodeURIComponent(part.slice(index + 1)) };
          });
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        const isLocalHttp =
          url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
        for (const { name, value, options } of cookiesToSet) {
          const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
          if (!isLocalHttp) parts.push("Secure");
          // maxAge=0은 PKCE verifier 삭제 지시이므로 falsy로 버리면 안 된다.
          if (options?.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
          setCookies.push(parts.join("; "));
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // 코드 값·오류 원문은 로그에 남기지 않는다(세션 탈취 재료가 될 수 있다).
    console.error("auth callback exchange failed");
    return redirect(url.origin, "/login?auth=exchange_failed", []);
  }

  return redirect(url.origin, next, setCookies);
}
