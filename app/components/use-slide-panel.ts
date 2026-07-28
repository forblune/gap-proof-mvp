"use client";
// #68/#69: 왼쪽 내비 드로어·데모 헤더 액션 패널이 공유하는 오버레이 동작.
// history 마커+popstate로 뒤로가기가 페이지 이탈보다 패널 닫기를 먼저 수행하고,
// focus trap·body 스크롤 잠금·포털 마운트 판정을 한 곳에서 관리한다.
import { useCallback, useEffect, useRef, useState } from "react";

export function useSlidePanel() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- 마운트 1회성 SSR→CSR 포털 전환 판정(연쇄 렌더 없음) */
  useEffect(() => { setMounted(true); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openRef = useRef(false);
  const pushedRef = useRef(false); // 패널이 쌓은 history 엔트리가 아직 살아있는가
  const wasOpen = useRef(false); // 최초 마운트 시 트리거로 focus를 빼앗지 않기 위한 구분
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { openRef.current = open; }, [open]);

  const finishClose = useCallback(() => {
    pushedRef.current = false;
    setOpen(false);
  }, []);

  const close = useCallback(() => {
    if (!openRef.current) return;
    if (pushedRef.current) {
      window.history.back(); // popstate 핸들러가 finishClose를 수행
      window.setTimeout(() => { if (openRef.current) finishClose(); }, 300); // popstate 유실 대비
    } else {
      finishClose();
    }
  }, [finishClose]);

  const openPanel = useCallback(() => {
    setOpen(true);
    try {
      window.history.pushState({ gpPanel: true }, "");
      pushedRef.current = true;
    } catch {
      pushedRef.current = false; // pushState가 막힌 환경에서도 패널 자체는 동작
    }
  }, []);

  const toggle = useCallback(() => (openRef.current ? close() : openPanel()), [close, openPanel]);

  useEffect(() => {
    const onPop = () => { if (openRef.current) finishClose(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [finishClose]);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove("drawer-open");
      if (wasOpen.current) triggerRef.current?.focus();
      return;
    }
    wasOpen.current = true;
    document.body.classList.add("drawer-open");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      // 지금 패널에는 버튼·링크만 있지만, 폼 요소가 하나라도 들어오면 트랩이 그 위를 건너뛴다.
      // 나중에 알아채기 어려운 종류의 결함이라 선택자를 미리 넓혀 둔다.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && current === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus(); }
      else if (!panelRef.current?.contains(current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("drawer-open"); };
  }, [open, close]);

  // 링크 클릭 등 "어차피 페이지/포커스 맥락이 바뀌는" 경우 전용 — history.back()을 부르지
  // 않고 시각 상태만 접는다. history.back()+네이티브 내비게이션을 동시에 걸면 WebKit에서
  // 내비게이션이 유실되는 경쟁 조건이 있었다(#68에서 확인).
  const dismiss = useCallback(() => { pushedRef.current = false; setOpen(false); }, []);

  return { open, mounted, toggle, close, dismiss, openPanel, triggerRef, closeRef, panelRef };
}
