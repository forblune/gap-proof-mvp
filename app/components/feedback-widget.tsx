"use client";

// 피드백 버튼 + 패널. 로그인 사용자에게만 보인다.
//
// 접근성:
//  - 아이콘만 두지 않고 접근성 이름과 툴팁(title)을 함께 준다.
//  - 패널은 <dialog>의 showModal()을 써서 포커스 트랩과 Esc 닫기를 브라우저에 맡긴다.
//  - 오류는 role="alert", 진행 상황은 role="status"로 읽힌다.
//
// 이미지:
//  - 파일 선택 · 드래그앤드롭 · 클립보드 붙여넣기(Ctrl/Cmd+V) 세 경로를 모두 지원한다.
//  - 미리보기·개별 삭제·진행 상태·제출 전 최종 확인을 제공한다.
//  - 최종 검증은 서버가 파일 시그니처로 다시 한다(여기 검사는 빠른 안내용이다).

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "../lib/supabase";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from "../lib/image-validate";

const CATEGORIES = [
  { id: "bug", label: "오류·버그" },
  { id: "hard_to_use", label: "사용하기 어려움" },
  { id: "wording", label: "설명·문구" },
  { id: "design", label: "디자인" },
  { id: "feature_idea", label: "기능 제안" },
  { id: "trust_privacy", label: "신뢰·개인정보" },
  { id: "other", label: "기타" },
] as const;

type Attachment = { id: string; file: File; previewUrl: string; error?: string };

export function FeedbackWidget() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // 상태 업데이터는 순수하게 두고, 사용자 안내는 밖에서 정한다.
  const addFiles = useCallback((incoming: File[]) => {
    setAttachments((current) => {
      const room = MAX_ATTACHMENTS - current.length;
      const tooMany = incoming.length > room;
      const oversized = incoming.slice(0, Math.max(room, 0)).filter((f) => f.size > MAX_ATTACHMENT_BYTES);
      const accepted = incoming
        .slice(0, Math.max(room, 0))
        .filter((f) => f.size <= MAX_ATTACHMENT_BYTES)
        .map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));

      queueMicrotask(() => {
        if (tooMany) setError(`이미지는 최대 ${MAX_ATTACHMENTS}장까지 첨부할 수 있습니다.`);
        else if (oversized.length > 0) setError(`${oversized[0].name || "이미지"}는 5MB를 넘어 첨부할 수 없습니다.`);
        else setError(null);
      });

      return [...current, ...accepted];
    });
  }, []);

  // 클립보드 붙여넣기 — 캡처 이미지를 그대로 넣을 수 있게 한다.
  useEffect(() => {
    if (!open) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length > 0) {
        event.preventDefault();
        addFiles(images);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, addFiles]);

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const reset = () => {
    attachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setAttachments([]);
    setCategory("");
    setRating(null);
    setMessage("");
    setConfirming(false);
    setError(null);
  };

  const canSubmit = category !== "" && message.trim().length >= 5 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("category", category);
      form.set("message", message.trim());
      if (rating !== null) form.set("rating", String(rating));
      form.set("pagePath", window.location.pathname);
      for (const item of attachments) form.append("attachments", item.file);

      const response = await fetch("/api/feedback", { method: "POST", body: form });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "피드백을 보내지 못했습니다. 잠시 후 다시 시도해 주십시오.");
        setConfirming(false);
        return;
      }
      setDone(data.message ?? "피드백을 보냈습니다.");
      reset();
      setOpen(false);
    } catch {
      setError("네트워크 문제로 보내지 못했습니다. 연결을 확인하고 다시 시도해 주십시오.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) return null;

  return (
    <>
      <button
        type="button"
        className="feedback-trigger"
        onClick={() => { setOpen(true); setDone(null); }}
        aria-label="피드백 보내기"
        title="피드백 보내기"
      >
        {/* 종이클립 — 아이콘만으로도 알아볼 수 있지만 이름은 항상 함께 전달한다 */}
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path
            d="M21 11.5 12.5 20a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.9-7.8"
            fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        <span className="feedback-trigger-label">피드백</span>
      </button>

      {done && <p className="feedback-toast" role="status">{done}</p>}

      <dialog ref={dialogRef} className="feedback-dialog" onClose={() => setOpen(false)} aria-label="피드백 보내기">
        <div className="feedback-panel">
          <div className="feedback-head">
            <h2>불편한 점을 알려 주십시오.</h2>
            <button type="button" className="secondary" onClick={() => setOpen(false)}>닫기</button>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <fieldset className="feedback-field">
            <legend>분류 (필수)</legend>
            <div className="feedback-chips">
              {CATEGORIES.map((item) => (
                <label key={item.id} className={`feedback-chip ${category === item.id ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="feedback-category"
                    value={item.id}
                    checked={category === item.id}
                    onChange={() => setCategory(item.id)}
                    disabled={busy}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="feedback-field">
            <legend>만족도 (선택)</legend>
            <div className="feedback-chips">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className={`feedback-chip ${rating === value ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="feedback-rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    disabled={busy}
                  />
                  {value}점
                </label>
              ))}
            </div>
          </fieldset>

          <div className="feedback-field">
            <label htmlFor="feedback-message">피드백 글 (필수)</label>
            <textarea
              id="feedback-message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="어떤 화면에서 무엇이 불편했는지 적어 주시면 가장 도움이 됩니다."
              disabled={busy}
              aria-describedby="feedback-message-hint"
            />
            <small id="feedback-message-hint" className="auth-hint">5자 이상 적어 주십시오.</small>
          </div>

          <div className="feedback-field">
            <span className="feedback-label">화면 캡처 (선택 · 최대 {MAX_ATTACHMENTS}장 · 각 5MB)</span>
            <div
              className={`feedback-drop ${dragging ? "is-dragging" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
              }}
            >
              <p>여기로 끌어다 놓거나, 붙여넣기(Ctrl/Cmd+V) 하거나</p>
              <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                파일 선택
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                aria-label="화면 캡처 파일 선택"
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </div>
            <p className="feedback-privacy-note">
              캡처 이미지에 이름, 이메일, 전화번호 등 민감한 정보가 포함되지 않았는지 확인해 주세요.
            </p>

            {attachments.length > 0 && (
              <ul className="feedback-previews">
                {attachments.map((item) => (
                  <li key={item.id}>
                    {/* 미리보기는 로컬 blob이며 서버로 미리 올리지 않는다 */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기(최적화 대상 아님) */}
                    <img src={item.previewUrl} alt={`첨부 미리보기: ${item.file.name || "이미지"}`} />
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => removeAttachment(item.id)}
                      disabled={busy}
                      aria-label={`첨부 빼기: ${item.file.name || "이미지"}`}
                    >
                      빼기
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {busy && <p className="auth-notice" role="status">보내는 중입니다…</p>}

          <div className="feedback-actions">
            {confirming ? (
              <>
                <p className="auth-hint" role="status">
                  이대로 보낼까요? 글 {message.trim().length}자
                  {attachments.length > 0 ? ` · 이미지 ${attachments.length}장` : " · 이미지 없음"}
                </p>
                <button type="button" className="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                  다시 보기
                </button>
                <button type="button" className="primary" onClick={submit} disabled={busy} aria-busy={busy}>
                  {busy ? "보내는 중…" : "보내기"}
                </button>
              </>
            ) : (
              <>
                {!canSubmit && !busy && (
                  <div role="status">
                    <ul className="cert-missing">
                      {category === "" && <li>분류를 선택해 주십시오.</li>}
                      {message.trim().length < 5 && <li>피드백 글을 5자 이상 적어 주십시오.</li>}
                    </ul>
                  </div>
                )}
                <button type="button" className="primary full" onClick={() => setConfirming(true)} disabled={!canSubmit}>
                  검토하고 보내기
                </button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
