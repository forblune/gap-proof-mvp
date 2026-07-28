// Supabase 클라이언트 생성 (브라우저 / 서버).
//
// 보안 규칙:
//  - 브라우저에 나가는 값은 프로젝트 URL과 publishable(anon) 키뿐이다. 이 둘은 공개 설계이며,
//    실제 보호는 RLS가 한다(supabase/migrations/0002~0005 참고 — anon에는 어떤 권한도 없다).
//  - service role / secret 키는 이 파일에서 절대 다루지 않는다. 필요해지면 서버 라우트에서
//    readServerEnv로만 읽고, 클라이언트로 내려보내지 않는다.
//  - OAuth client secret은 이 앱이 보관하지 않는다. 코드↔토큰 교환은 Supabase가 수행한다.

import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";

// 빌드 시점에 인라인되는 공개 설정. Workers 바인딩은 빌드 타임에 없으므로 이 두 값만 NEXT_PUBLIC_이다.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 설정이 없으면 인증 기능을 조용히 실패시키지 않고, 호출부가 "아직 준비되지 않음"을 표시하게 한다.
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

export type CookieStore = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: CookieOptions }[]) => void;
};

// 서버(라우트 핸들러)용. PKCE 검증자는 쿠키로 오가므로 같은 쿠키 저장소를 공유해야 한다.
export function createServerSupabase(cookies: CookieStore) {
  if (!isSupabaseConfigured()) return null;
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { cookies });
}

// 사용자에게 보여 줄 인증 오류 문구. 원문 오류를 그대로 노출하지 않는다.
export function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 일치하지 않습니다.";
    case "email_not_confirmed":
      return "이메일 확인이 아직 끝나지 않았습니다. 받은 편지함에서 확인 메일을 열어 주십시오.";
    case "user_already_exists":
    case "email_exists":
      return "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용해 주십시오.";
    case "weak_password":
      return "비밀번호가 너무 짧습니다. 8자 이상으로 정해 주십시오.";
    case "over_email_send_rate_limit":
      return "메일을 너무 자주 보냈습니다. 잠시 후 다시 시도해 주십시오.";
    case "validation_failed":
      return "입력한 내용을 다시 확인해 주십시오.";
    default:
      return fallback;
  }
}
