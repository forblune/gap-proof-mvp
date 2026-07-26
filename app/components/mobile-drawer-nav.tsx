"use client";
// #68: 모바일(≤720px) 헤더용 햄버거 + 왼쪽 슬라이드 드로어.
// 데스크톱 내비(.info-nav)는 서버 마크업 그대로 두고 CSS로 상호 배타 노출한다.
// 열림 상태를 history 엔트리로도 표현해 브라우저 뒤로가기가 페이지 이탈보다 드로어 닫기를 먼저 수행한다.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV_ITEMS } from "./site-nav";

export default function MobileDrawerNav({ active = null }: { active?: string | null }) {
  const [open, setOpen] = useState(false);
  // .topbar의 backdrop-filter가 fixed 자손의 containing block을 헤더 박스로 축소시킨다 —
  // 드로어를 body로 포털링해 항상 뷰포트 기준으로 뜨게 한다. mounted 이전엔 SSR과 동일하게 미렌더.
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- 마운트 1회성 SSR→CSR 포털 전환 판정(연쇄 렌더 없음) */
  useEffect(() => { setMounted(true); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const openRef = useRef(false);
  const pushedRef = useRef(false); // 드로어가 쌓은 history 엔트리가 아직 살아있는가
  const wasOpen = useRef(false); // 최초 마운트 시 토글로 focus를 빼앗지 않기 위한 구분
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { openRef.current = open; }, [open]);

  const finishClose = useCallback(() => {
    pushedRef.current = false;
    setOpen(false);
  }, []);

  const closeDrawer = useCallback(() => {
    if (!openRef.current) return;
    if (pushedRef.current) {
      window.history.back(); // popstate 핸들러가 finishClose를 수행
      window.setTimeout(() => { if (openRef.current) finishClose(); }, 300); // popstate 유실 대비
    } else {
      finishClose();
    }
  }, [finishClose]);

  const openDrawer = useCallback(() => {
    setOpen(true);
    try {
      window.history.pushState({ gpDrawer: true }, "");
      pushedRef.current = true;
    } catch {
      pushedRef.current = false; // pushState가 막힌 환경에서도 드로어 자체는 동작
    }
  }, []);

  useEffect(() => {
    const onPop = () => { if (openRef.current) finishClose(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [finishClose]);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove("drawer-open");
      if (wasOpen.current) toggleRef.current?.focus();
      return;
    }
    wasOpen.current = true;
    document.body.classList.add("drawer-open");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeDrawer(); return; }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
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
  }, [open, closeDrawer]);

  // 링크 이동은 브라우저 기본 동작에 맡긴다(preventDefault+assign 없음) — 목적지 라우트가
  // 새로 마운트되며 자연히 닫힌 상태로 시작한다. history.back()로 직접 가로채면 WebKit에서
  // 뒤로가기 직후의 assign 내비게이션이 유실되는 경쟁 조건이 있었다. setOpen(false)는 전환
  // 중 시각적으로 즉시 반영되도록 하는 정도이며 내비게이션 자체를 막지 않는다.
  const onNavClick = () => setOpen(false);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-controls="gp-drawer"
        onClick={() => (open ? closeDrawer() : openDrawer())}
      >
        <span /><span /><span />
      </button>
      {mounted && createPortal(
        <div className={open ? "drawer-root open" : "drawer-root"} aria-hidden={open ? undefined : true}>
          <div className="drawer-backdrop" onClick={closeDrawer} />
          <div id="gp-drawer" ref={panelRef} className="drawer-panel" role="dialog" aria-modal="true" aria-label="메뉴">
            <div className="drawer-head">
              <button ref={closeRef} type="button" className="drawer-close" aria-label="메뉴 닫기" onClick={closeDrawer}>
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <nav className="drawer-nav" aria-label="정보 페이지">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={item.href === active ? "page" : undefined}
                  onClick={onNavClick}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <a className="drawer-cta" href="/demo" onClick={onNavClick}>데모 열기 <span aria-hidden="true">→</span></a>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
