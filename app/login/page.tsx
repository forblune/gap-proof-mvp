"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthError, AuthNotice, AuthShell, AuthUnconfigured } from "../components/auth-shell";
import { authErrorMessage, createClient, isSupabaseConfigured } from "../lib/supabase";

// 소셜 로그인은 Supabase에 provider가 실제로 설정돼 있어야만 동작한다.
// 설정 여부를 코드가 알 수 없으므로, 눌렀을 때 실패하면 그 사실을 그대로 알린다
// (버튼만 있고 동작하지 않는 상태를 숨기지 않는다).
// 콜백(app/auth/callback/route.ts)이 돌려보내는 사유 → 사용자 언어.
// URL만 바뀌고 화면이 침묵하면 사용자는 왜 로그인이 안 됐는지 알 수 없다.
const CALLBACK_REASONS: Record<string, string> = {
  cancelled: "로그인을 취소하셨습니다. 다시 시도하시거나 이메일로 로그인해 주십시오.",
  provider_error: "외부 로그인에서 문제가 생겼습니다. 잠시 후 다시 시도하거나 이메일로 로그인해 주십시오.",
  missing_code: "로그인 절차가 끝나지 않았습니다. 처음부터 다시 시도해 주십시오.",
  exchange_failed: "로그인 정보를 확인하지 못했습니다. 링크가 만료됐을 수 있으니 다시 시도해 주십시오.",
  unconfigured: "이 환경에는 계정 기능이 연결되어 있지 않습니다.",
};

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google로 계속하기" },
  { id: "kakao", label: "Kakao로 계속하기" },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 콜백 사유는 URL에만 있고 서버 렌더 시점에는 알 수 없으므로 마운트 후 1회 읽는다.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("auth");
    const message = reason ? CALLBACK_REASONS[reason] : undefined;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- 진입 시 1회 표시(연쇄 렌더 없음) */
    if (message) setError(message);
  }, []);

  if (!isSupabaseConfigured()) return <AuthUnconfigured />;

  const signInWithEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return; // 중복 제출 방지
    setError(null);
    setNotice(null);
    setBusy("email");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("unconfigured");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(authErrorMessage(signInError.code, "로그인하지 못했습니다. 잠시 후 다시 시도해 주십시오."));
        return;
      }
      window.location.assign("/profile");
    } catch {
      setError("네트워크 문제로 로그인하지 못했습니다. 연결을 확인하고 다시 시도해 주십시오.");
    } finally {
      setBusy(null);
    }
  };

  const signInWithProvider = async (provider: string) => {
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy(provider);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("unconfigured");
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider as "google" | "kakao",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
      });
      if (oauthError) {
        // provider 미설정·취소 등은 여기서 그대로 드러난다.
        setError(
          `${provider === "google" ? "Google" : "Kakao"} 로그인을 시작하지 못했습니다. 이 방법이 아직 연결되지 않았을 수 있습니다. 이메일로 로그인해 주십시오.`,
        );
        setBusy(null);
      }
      // 성공 시 브라우저가 외부 인증 화면으로 이동한다(여기서 busy를 풀지 않는다).
    } catch {
      setError("네트워크 문제로 로그인을 시작하지 못했습니다.");
      setBusy(null);
    }
  };

  return (
    <AuthShell
      eyebrow="Login"
      title="다시 오셨군요."
      lead="저장해 둔 증거카드와 학습 기록을 이어서 보려면 로그인해 주십시오."
      footer={
        <>
          <span>계정이 없으신가요? <Link href="/signup">회원가입</Link></span>
          <span><Link href="/forgot-password">비밀번호 재설정하기</Link></span>
        </>
      }
    >
      <AuthError message={error} id="login-error" />
      <AuthNotice message={notice} />

      <form className="auth-form" onSubmit={signInWithEmail} noValidate>
        <label htmlFor="login-email">이메일</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={error ? "login-error" : undefined}
          disabled={busy !== null}
        />

        <label htmlFor="login-password">비밀번호</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={error ? "login-error" : undefined}
          disabled={busy !== null}
        />

        <button className="primary full" type="submit" disabled={busy !== null} aria-busy={busy === "email"}>
          {busy === "email" ? "로그인 중…" : "로그인"}
        </button>
      </form>

      <div className="auth-divider"><span>또는</span></div>

      <div className="auth-social">
        {SOCIAL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="secondary full"
            onClick={() => signInWithProvider(provider.id)}
            disabled={busy !== null}
            aria-busy={busy === provider.id}
          >
            {busy === provider.id ? "이동 중…" : provider.label}
          </button>
        ))}
      </div>
    </AuthShell>
  );
}
