"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthError, AuthNotice, AuthShell, AuthUnconfigured } from "../components/auth-shell";
import { createClient, isSupabaseConfigured } from "../lib/supabase";

type SavedCard = { id: string; role_id: string; created_at: string; includes_quotes: boolean };
type SavedCert = { id: string; kind: string; serial: string; issued_at: string };

// 프로필 — 저장된 기록을 보고, 개별 삭제하고, 탈퇴할 수 있는 화면.
// 모든 조회는 RLS가 걸린 테이블을 대상으로 하므로 본인 행만 돌아온다(정책은 supabase/migrations 참고).
export default function ProfilePage() {
  const [state, setState] = useState<"loading" | "anon" | "ready">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [certs, setCerts] = useState<SavedCert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setState("anon");
      return;
    }
    setEmail(session.user.email ?? null);
    setEmailVerified(Boolean(session.user.email_confirmed_at));

    const [cardResult, certResult] = await Promise.all([
      supabase.from("proof_cards").select("id, role_id, created_at, includes_quotes").order("created_at", { ascending: false }),
      supabase.from("certificates").select("id, kind, serial, issued_at").order("issued_at", { ascending: false }),
    ]);
    if (cardResult.error || certResult.error) {
      setError("저장된 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.");
    }
    setCards((cardResult.data as SavedCard[]) ?? []);
    setCerts((certResult.data as SavedCert[]) ?? []);
    setState("ready");
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 세션·기록을 1회 조회한다(연쇄 렌더 없음) */
    if (isSupabaseConfigured()) void load();
  }, [load]);

  if (!isSupabaseConfigured()) return <AuthUnconfigured />;

  const signOut = async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  const deleteCard = async (id: string) => {
    if (deleting) return; // 연타로 같은 요청이 두 번 나가지 않게 한다
    setDeleting(true);
    const supabase = createClient();
    if (!supabase) { setDeleting(false); return; }
    const { error: deleteError } = await supabase.from("proof_cards").delete().eq("id", id);
    if (deleteError) {
      setError("삭제하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
      setDeleting(false);
      return;
    }
    setConfirmingDelete(null);
    setNotice("삭제했습니다.");
    setDeleting(false);
    void load();
  };

  if (state === "loading") {
    return (
      <AuthShell eyebrow="Profile" title="불러오는 중입니다." lead="저장된 기록을 확인하고 있습니다.">
        <p className="auth-hint" role="status">잠시만 기다려 주십시오…</p>
      </AuthShell>
    );
  }

  if (state === "anon") {
    return (
      <AuthShell
        eyebrow="Profile"
        title="로그인이 필요한 화면입니다."
        lead="저장된 기록은 본인만 볼 수 있습니다."
        footer={<span><Link href="/login">로그인</Link> · <Link href="/signup">회원가입</Link></span>}
      >
        <p className="auth-hint">
          로그인하지 않아도 <Link href="/demo">데모 분석</Link>은 그대로 쓸 수 있습니다. 다만 결과를 영구 보관할 수는 없습니다.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Profile"
      title="내 기록"
      lead={email ? `${email} 계정으로 로그인했습니다.` : "로그인했습니다."}
      footer={<button className="secondary" type="button" onClick={signOut}>로그아웃</button>}
    >
      <AuthError message={error} id="profile-error" />
      <AuthNotice message={notice} />

      {!emailVerified && (
        <p className="auth-notice" role="status">
          이메일 확인이 아직 끝나지 않았습니다. 받은 편지함에서 확인 링크를 열어 주십시오.
        </p>
      )}

      <section className="profile-section">
        <h2>저장한 증거카드 ({cards.length})</h2>
        {cards.length === 0 ? (
          <p className="auth-hint">아직 저장한 증거카드가 없습니다. <Link href="/demo">데모</Link>에서 만들어 보십시오.</p>
        ) : (
          <ul className="profile-list">
            {cards.map((card) => (
              <li key={card.id}>
                <div>
                  <b>{card.role_id}</b>
                  <small>
                    {new Date(card.created_at).toLocaleDateString("ko-KR")}
                    {card.includes_quotes ? " · 경험 원문 포함(동의함)" : " · 경험 원문 미포함"}
                  </small>
                </div>
                {confirmingDelete === card.id ? (
                  <span className="profile-confirm" role="alertdialog" aria-label="삭제 확인">
                    <small>되돌릴 수 없습니다.</small>
                    <button type="button" className="secondary" onClick={() => setConfirmingDelete(null)}>취소</button>
                    <button type="button" className="danger" onClick={() => deleteCard(card.id)} disabled={deleting} aria-busy={deleting}>삭제</button>
                  </span>
                ) : (
                  <button type="button" className="secondary" onClick={() => setConfirmingDelete(card.id)}>삭제</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-section">
        <h2>발급한 문서 ({certs.length})</h2>
        {certs.length === 0 ? (
          <p className="auth-hint">아직 발급한 문서가 없습니다.</p>
        ) : (
          <ul className="profile-list">
            {certs.map((cert) => (
              <li key={cert.id}>
                <div>
                  <b>{cert.kind === "performance" ? "수행 확인서" : cert.kind === "learning" ? "학습 수료증" : "외부 증빙"}</b>
                  <small>{cert.serial} · {new Date(cert.issued_at).toLocaleDateString("ko-KR")}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-section">
        <h2>계정</h2>
        <p className="auth-hint">
          탈퇴하면 저장한 경험·분석 기록·증거카드·학습 기록·발급 문서·외부 증빙이 <b>모두 함께 삭제</b>됩니다.
          탈퇴는 <Link href="/privacy">개인정보 처리방침</Link>에 적힌 절차로 요청해 주십시오(자동 탈퇴 기능은 준비 중입니다).
        </p>
      </section>
    </AuthShell>
  );
}
