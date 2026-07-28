"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthError, AuthNotice, AuthShell, AuthUnconfigured } from "../components/auth-shell";
import { authErrorMessage, createClient, isSupabaseConfigured } from "../lib/supabase";

// 소셜 로그인은 Supabase에 provider가 실제로 설정돼 있어야만 동작한다.
// 설정 여부를 코드가 알 수 없으므로, 눌렀을 때 실패하면 그 사실을 그대로 알린다
// (버튼만 있고 동작하지 않는 상태를 숨기지 않는다).
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
          <span><Link href="/forgot-password">비밀번호를 잊으셨나요?</Link></span>
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
