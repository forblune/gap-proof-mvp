"use client";
// #68: 모바일(≤720px) 헤더용 햄버거 + 왼쪽 슬라이드 드로어.
// 데스크톱 내비(.info-nav)는 서버 마크업 그대로 두고 CSS로 상호 배타 노출한다.
import { createPortal } from "react-dom";
import { NAV_ITEMS } from "./site-nav";
import ThemeToggle from "./theme-toggle";
import { useSlidePanel } from "./use-slide-panel";

export default function MobileDrawerNav({ active = null }: { active?: string | null }) {
  const { open, mounted, toggle, close, dismiss, triggerRef, closeRef, panelRef } = useSlidePanel();

  // 링크 이동은 브라우저 기본 동작에 맡긴다(preventDefault 없음) — 목적지 라우트가 새로
  // 마운트되며 자연히 닫힌 상태로 시작한다. dismiss()는 history.back()을 부르지 않는다 —
  // close()를 쓰면 네이티브 내비게이션과 겹쳐 WebKit에서 내비게이션이 유실되는 경쟁 조건이 있었다.
  const onNavClick = () => dismiss();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="nav-toggle"
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-controls="gp-drawer"
        onClick={toggle}
      >
        <span /><span /><span />
      </button>
      {mounted && createPortal(
        <div className={open ? "drawer-root open" : "drawer-root"} aria-hidden={open ? undefined : true}>
          <div className="drawer-backdrop" onClick={close} />
          <div id="gp-drawer" ref={panelRef} className="drawer-panel" role="dialog" aria-modal="true" aria-label="메뉴">
            <div className="drawer-head">
              <ThemeToggle />
              <button ref={closeRef} type="button" className="drawer-close" aria-label="메뉴 닫기" onClick={close}>
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
