"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthError, AuthNotice, AuthShell, AuthUnconfigured } from "../components/auth-shell";
import { createClient, isSupabaseConfigured } from "../lib/supabase";
import { ROLES } from "../lib/engine";

// 저장된 값은 role_id(내부 식별자)다. 화면에는 사람이 읽는 이름을 보여 준다.
function roleLabel(roleId: string): string {
  return ROLES.find((role) => role.id === roleId)?.label ?? roleId;
}

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
  // 조회 실패와 "기록이 없음"은 완전히 다른 상태다. 구분하지 않으면
  // 불러오기에 실패했을 뿐인데 사용자는 자기 기록이 사라졌다고 읽는다.
  const [loadFailed, setLoadFailed] = useState(false);

  // 확인 창이 열릴 때 첫 버튼으로 포커스를 옮긴다(콜백 ref — 마운트 시점에 정확히 한 번 실행된다).
  const focusConfirm = useCallback((node: HTMLButtonElement | null) => {
    node?.focus();
  }, []);

  // 취소하면 원래 눌렀던 삭제 버튼으로 포커스를 되돌린다.
  // 되돌리지 않으면 확인이 사라지면서 포커스가 body 로 떨어져 키보드 사용자가 위치를 잃는다.
  const deleteTriggers = useRef(new Map<string, HTMLButtonElement>());
  const registerDeleteTrigger = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) deleteTriggers.current.set(id, node);
    else deleteTriggers.current.delete(id);
  }, []);
  const cancelDelete = useCallback((id: string) => {
    setConfirmingDelete(null);
    // 취소 버튼이 언마운트된 뒤에 원래 버튼이 다시 마운트되므로 다음 프레임에 옮긴다.
    requestAnimationFrame(() => deleteTriggers.current.get(id)?.focus());
  }, []);
  const [deleting, setDeleting] = useState(false);

  const loadInner = useCallback(async (supabase: NonNullable<ReturnType<typeof createClient>>) => {
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
    const failed = Boolean(cardResult.error || certResult.error);
    setLoadFailed(failed);
    if (failed) {
      setError("저장된 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.");
    }
    setCards((cardResult.data as SavedCard[]) ?? []);
    setCerts((certResult.data as SavedCert[]) ?? []);
    setState("ready");
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      await loadInner(supabase);
    } catch {
      // 세션 조회 자체가 실패해도 화면이 로딩에 갇히면 안 된다.
      setLoadFailed(true);
      setError("기록을 불러오지 못했습니다. 네트워크를 확인하고 새로고침해 주십시오.");
      setState("ready");
    }
  }, [loadInner]);

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
        <h2>저장한 증거카드 {loadFailed ? "" : `(${cards.length})`}</h2>
        {loadFailed ? (
          <p className="auth-hint">
            목록을 불러오지 못했습니다. 기록이 없다는 뜻이 아닙니다. 새로고침해 주십시오.
          </p>
        ) : cards.length === 0 ? (
          <p className="auth-hint">아직 저장한 증거카드가 없습니다. <Link href="/demo">데모</Link>에서 만들어 보십시오.</p>
        ) : (
          <ul className="profile-list">
            {cards.map((card) => (
              <li key={card.id}>
                <div>
                  <b>{roleLabel(card.role_id)}</b>
                  <small>
                    {new Date(card.created_at).toLocaleDateString("ko-KR")}
                    {card.includes_quotes ? " · 경험 원문 포함(동의함)" : " · 경험 원문 미포함"}
                  </small>
                </div>
                {confirmingDelete === card.id ? (
                  // alertdialog 은 focus trap·Escape·aria-modal 을 약속한다. 여기는 인라인 확인이므로
                  // 지키지 못할 약속 대신 실제 동작에 맞는 group 을 쓴다.
                  <span className="profile-confirm" role="group" aria-label={`${roleLabel(card.role_id)} 증거카드 삭제 확인`}>
                    <small>되돌릴 수 없습니다.</small>
                    {/* 삭제 버튼이 사라지면서 포커스가 body로 떨어진다 — 확인 안으로 옮긴다. */}
                    <button type="button" className="secondary" ref={focusConfirm} onClick={() => cancelDelete(card.id)}>취소</button>
                    <button type="button" className="danger" onClick={() => deleteCard(card.id)} disabled={deleting} aria-busy={deleting}>
                      삭제<span className="sr-only"> — {roleLabel(card.role_id)} 증거카드</span>
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    ref={(node) => registerDeleteTrigger(card.id, node)}
                    onClick={() => setConfirmingDelete(card.id)}
                  >
                    삭제<span className="sr-only"> — {roleLabel(card.role_id)} 증거카드</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-section">
        <h2>발급한 문서 {loadFailed ? "" : `(${certs.length})`}</h2>
        {loadFailed ? (
          <p className="auth-hint">
            목록을 불러오지 못했습니다. 기록이 없다는 뜻이 아닙니다. 새로고침해 주십시오.
          </p>
        ) : certs.length === 0 ? (
          <p className="auth-hint">아직 발급한 문서가 없습니다. 현재 버전은 발급 문서를 서버에 저장하지 않습니다.</p>
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
          탈퇴하면 계정 정보와 보낸 피드백을 포함해 이 계정에 연결된 모든 행을 <b>함께 삭제</b>합니다
          (합성 계정으로 실제 삭제를 실행해 남는 행이 0건인 것을 확인했습니다).
          탈퇴는 <Link href="/privacy">개인정보 처리방침</Link>에 적힌 절차로 요청해 주십시오(자동 탈퇴 기능은 준비 중입니다).
        </p>
      </section>
    </AuthShell>
  );
}
