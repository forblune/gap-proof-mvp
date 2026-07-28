"use client";

import { useEffect, useState } from "react";
import { AuthError, AuthNotice, AuthShell, AuthUnconfigured } from "../components/auth-shell";
import { authErrorMessage, createClient, isSupabaseConfigured } from "../lib/supabase";

// 재설정 링크로 들어오면 /auth/callback이 세션을 만들어 준 뒤 이 화면으로 보낸다.
// 세션이 없으면(만료·잘못된 링크) 새 비밀번호 입력을 열어 두지 않는다.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setReady(data.session ? "ok" : "no-session");
    });
  }, []);

  if (!isSupabaseConfigured()) return <AuthUnconfigured />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || password.length < 8) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("unconfigured");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(authErrorMessage(updateError.code, "비밀번호를 바꾸지 못했습니다. 링크가 만료됐을 수 있습니다."));
        return;
      }
      setNotice("비밀번호를 바꿨습니다. 잠시 후 프로필로 이동합니다.");
      setTimeout(() => window.location.assign("/profile"), 1200);
    } catch {
      setError("네트워크 문제로 바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password"
      title="새 비밀번호를 정해 주십시오."
      lead="8자 이상으로 정해 주시면 바로 적용됩니다."
    >
      <AuthError message={error} id="reset-error" />
      <AuthNotice message={notice} />
      {ready === "checking" && <p className="auth-hint" role="status">링크를 확인하는 중입니다…</p>}
      {ready === "no-session" && (
        <p className="auth-error" role="alert">
          링크가 만료됐거나 올바르지 않습니다. 비밀번호 재설정을 다시 요청해 주십시오.
        </p>
      )}
      {ready === "ok" && (
        <form className="auth-form" onSubmit={submit} noValidate>
          <label htmlFor="new-password">새 비밀번호</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={error ? "reset-error" : undefined}
            disabled={busy}
          />
          <button className="primary full" type="submit" disabled={busy || password.length < 8} aria-busy={busy}>
            {busy ? "바꾸는 중…" : "비밀번호 바꾸기"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
