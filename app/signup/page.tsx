"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthError, AuthNotice, AuthShell, AuthUnconfigured } from "../components/auth-shell";
import { authErrorMessage, createClient, isSupabaseConfigured } from "../lib/supabase";

// 동의 규칙(개인정보 처리방침 v0.2와 1:1):
//  - 필수 동의(서비스 이용·개인정보 처리, 만 14세 이상)와 선택 동의를 분리한다.
//  - 사전 체크된 동의는 두지 않는다 — 모든 체크박스의 초기값은 false다.
//  - 경험 원문 저장 동의는 가입 단계에서 받지 않는다(저장하는 그 순간에 묻는다).
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeService, setAgreeService] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isSupabaseConfigured()) return <AuthUnconfigured />;

  // 버튼이 왜 눌리지 않는지 화면에 그대로 적는다 — 이유를 숨기면 사용자가 원인을 추측하게 된다.
  const missing = [
    email.trim() ? null : "이메일을 입력해 주십시오.",
    password.length >= 8 ? null : "비밀번호를 8자 이상 입력해 주십시오.",
    agreeService ? null : "이용약관과 개인정보 처리방침 동의가 필요합니다.",
    agreeAge ? null : "만 14세 이상 확인이 필요합니다.",
  ].filter((item): item is string => item !== null);
  const canSubmit = missing.length === 0 && !busy;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("unconfigured");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile` },
      });
      if (signUpError) {
        setError(authErrorMessage(signUpError.code, "가입하지 못했습니다. 잠시 후 다시 시도해 주십시오."));
        return;
      }
      // 이미 가입된 이메일이면 Supabase는 오류 대신 빈 identities를 돌려준다(계정 존재 노출 방지).
      // 이 경우에도 같은 안내를 보여 주어 어느 쪽인지 추측할 수 없게 한다.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setNotice("확인 메일을 보냈습니다. 받은 편지함에서 링크를 열어 주십시오. 이미 가입된 이메일이라면 로그인하거나 비밀번호 재설정을 이용해 주십시오.");
        return;
      }
      setNotice("확인 메일을 보냈습니다. 받은 편지함에서 링크를 열면 가입이 끝납니다.");
    } catch {
      setError("네트워크 문제로 가입하지 못했습니다. 연결을 확인하고 다시 시도해 주십시오.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Signup"
      title="쌓은 증거를 이어서 보관합니다."
      lead="계정은 저장을 위한 것입니다. 인정 범위와 증거등급은 로그인 여부와 관계없이 똑같습니다."
      footer={<span>이미 계정이 있으신가요? <Link href="/login">로그인</Link></span>}
    >
      <AuthError message={error} id="signup-error" />
      <AuthNotice message={notice} />

      <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="signup-email">이메일</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={error ? "signup-error" : undefined}
          disabled={busy}
        />

        <label htmlFor="signup-password">비밀번호</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="signup-password-hint"
          disabled={busy}
        />
        <small id="signup-password-hint" className="auth-hint">8자 이상으로 정해 주십시오.</small>

        <fieldset className="auth-consents">
          <legend>동의</legend>
          <label className="auth-consent">
            <input type="checkbox" checked={agreeService} onChange={(e) => setAgreeService(e.target.checked)} disabled={busy} />
            <span>
              <b>(필수)</b> <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보 처리방침</Link>에 동의합니다.
            </span>
          </label>
          <label className="auth-consent">
            <input type="checkbox" checked={agreeAge} onChange={(e) => setAgreeAge(e.target.checked)} disabled={busy} />
            <span><b>(필수)</b> 만 14세 이상입니다.</span>
          </label>
          <p className="auth-hint">
            경험 원문을 저장할지는 여기서 묻지 않습니다. 실제로 저장하는 순간에 따로 여쭤보며, 동의하지 않아도 모든 기능을 쓸 수 있습니다.
          </p>
        </fieldset>

        {/* 영역을 항상 두고 내용만 비운다 — 언마운트하면 마지막 사유가 사라지는 순간이 낭독되지 않는다. */}
        <div role="status" id="signup-missing">
          {missing.length > 0 ? (
            <ul className="cert-missing">
              {missing.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <p className="sr-only">입력이 모두 채워졌습니다. 이제 가입할 수 있습니다.</p>
          )}
        </div>

        <button
          className="primary full"
          type="submit"
          disabled={!canSubmit}
          aria-busy={busy}
          aria-describedby="signup-missing"
        >
          {busy ? "가입 중…" : "가입하고 확인 메일 받기"}
        </button>
      </form>
    </AuthShell>
  );
}
