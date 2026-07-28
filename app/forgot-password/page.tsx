"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthError, AuthNotice, AuthShell, AuthUnconfigured } from "../components/auth-shell";
import { authErrorMessage, createClient, isSupabaseConfigured } from "../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isSupabaseConfigured()) return <AuthUnconfigured />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("unconfigured");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) {
        setError(authErrorMessage(resetError.code, "재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주십시오."));
        return;
      }
      // 계정 존재 여부를 노출하지 않도록, 가입 여부와 무관하게 같은 안내를 보여 준다.
      setNotice("입력하신 주소로 가입된 계정이 있다면 재설정 링크를 보냈습니다. 받은 편지함을 확인해 주십시오.");
    } catch {
      setError("네트워크 문제로 요청하지 못했습니다. 연결을 확인하고 다시 시도해 주십시오.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password"
      title="비밀번호를 다시 정합니다."
      lead="가입한 이메일 주소를 적어 주시면 재설정 링크를 보내 드립니다."
      footer={<span><Link href="/login">로그인으로 돌아가기</Link></span>}
    >
      <AuthError message={error} id="forgot-error" />
      <AuthNotice message={notice} />
      <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="forgot-email">이메일</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={error ? "forgot-error" : undefined}
          disabled={busy}
        />
        <button className="primary full" type="submit" disabled={busy || !email.trim()} aria-busy={busy}>
          {busy ? "보내는 중…" : "재설정 링크 받기"}
        </button>
      </form>
    </AuthShell>
  );
}
