"use client";

// 라이트/다크 테마 토글 — 헤더에 노출되는 유일한 테마 제어 지점.
// 우선순위: localStorage 저장값 > prefers-color-scheme > 라이트 기본값(fallback).
// 실제 적용은 app/layout.tsx의 하이드레이션 이전 인라인 스크립트가 담당하며(깜빡임 방지),
// 이 컴포넌트는 그 결과를 읽어 아이콘·라벨을 맞추고 토글 시 갱신만 한다.
import { useEffect, useState } from "react";

const STORAGE_KEY = "gapproof-theme";

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

const base = {
  viewBox: "0 0 24 24",
  "aria-hidden": true as const,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconSun() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg {...base}>
      <path d="M20 13.2A8.2 8.2 0 1 1 10.8 4a6.4 6.4 0 0 0 9.2 9.2Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  // 서버 렌더·최초 하이드레이션 프레임은 실제 테마를 알 수 없어 null로 시작한다(서버·클라이언트가
  // 동일하게 렌더되어 하이드레이션 불일치가 없다). useEffect가 마운트 직후 실제 값으로 채운다.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- 마운트 1회성 SSR→CSR 실제 테마 판정(연쇄 렌더 없음) */
  useEffect(() => {
    setTheme(readTheme());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (theme === null) {
    return (
      <button type="button" className="theme-toggle" aria-label="테마 전환" disabled>
        <IconMoon />
      </button>
    );
  }

  const isDark = theme === "dark";
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 프라이빗 모드 등 storage 접근 불가 — 이번 세션에서만 테마가 적용되고 다음 방문엔 시스템 기본값으로 돌아간다
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {isDark ? <IconSun /> : <IconMoon />}
      <span className="theme-toggle-label">{isDark ? "라이트" : "다크"}</span>
    </button>
  );
}
