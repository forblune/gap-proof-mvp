"use client";

// 라이트/다크 테마 토글.
//
// **단일 진실 소스는 `<html data-theme>` 하나다.**
// 토글은 헤더와 모바일 드로어 두 곳에 있다(page.tsx·info-shell.tsx·demo/page.tsx·mobile-drawer-nav.tsx).
// 예전에는 각 인스턴스가 제 React state 로 모양을 그려서, 한쪽을 누르면 다른 쪽 상태가 낡은 채
// 남았다. 지금은 **보이는 상태를 CSS 가 `:root[data-theme="dark"]` 에서 그린다** — 어느 쪽을
// 눌러도 두 토글이 자동으로 같아지고, 하이드레이션 전에도 이미 올바른 모양이다.
// 아래 state 는 화면을 그리는 데 쓰지 않는다. aria-checked 를 채우는 용도뿐이며,
// MutationObserver 로 같은 단일 진실 소스를 따라간다.
//
// **레이아웃을 움직이지 않는다.**
// 예전 구현은 라벨이 "다크"(2자) ↔ "라이트"(3자)로 바뀌었다. 폭이 고정돼 있지 않아
// 토글이 71.5→82.75px 로 늘었고, 1440px 에서 내비 링크 6개가 전부 11.25px 씩 밀렸다(실측).
// 게다가 첫 페인트에는 라벨 없는 disabled 버튼을 그려서, 마운트 직후 또 한 번 폭이 변했다.
// 지금은 두 문구를 같은 그리드 칸에 겹쳐 두어 **컨테이너 폭이 상태와 무관하게 고정**되고,
// 상태 전환은 transform·opacity·background-color 로만 일어난다.
//
// 최초 적용은 app/layout.tsx 의 하이드레이션 이전 인라인 스크립트가 담당한다(깜빡임 방지).
import { useEffect, useState } from "react";

const STORAGE_KEY = "gapproof-theme";

const base = {
  viewBox: "0 0 24 24",
  "aria-hidden": true as const,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconSun() {
  return (
    <svg {...base} className="theme-toggle-icon" data-icon="sun">
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 1.8v3.1M12 19.1v3.1M1.8 12h3.1M19.1 12h3.1M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M4.9 19.1l2.2-2.2M16.9 7.1l2.2-2.2" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg {...base} className="theme-toggle-icon" data-icon="moon">
      <path d="M20 13.2A8.2 8.2 0 1 1 10.8 4a6.4 6.4 0 0 0 9.2 9.2Z" />
    </svg>
  );
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function storedChoice(): "light" | "dark" | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // 프라이빗 모드 등 storage 접근 불가
  }
}

export default function ThemeToggle() {
  // 화면을 그리는 값이 아니다 — aria-checked 전용. 서버·클라이언트 첫 렌더가 모두 false 라
  // 하이드레이션 불일치가 없고, 속성만 바뀌므로 레이아웃도 움직이지 않는다.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark(currentTheme() === "dark");
    sync();

    // 다른 토글 인스턴스가 바꿔도 따라오도록 단일 진실 소스를 관찰한다.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // 사용자가 직접 고른 적이 없을 때만 시스템 테마 변경을 따라간다.
    // 명시적으로 고른 값을 시스템 설정이 덮어쓰면 사용자의 선택을 무시하는 것이 된다.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (event: MediaQueryListEvent) => {
      if (storedChoice()) return;
      document.documentElement.setAttribute("data-theme", event.matches ? "dark" : "light");
    };
    media.addEventListener("change", onSystemChange);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onSystemChange);
    };
  }, []);

  // 다음 값은 state 가 아니라 DOM 에서 읽는다. 연타해도 마지막 상태가 어긋나지 않는다
  // (state 는 MutationObserver 를 거쳐 뒤늦게 갱신되므로 그것을 기준 삼으면 밀린 값을 뒤집는다).
  const toggle = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage 불가 — 이번 세션에만 적용되고 다음 방문엔 시스템 기본값으로 돌아간다
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={isDark}
      // 이름은 상태에 따라 바뀌지 않는다. 상태는 aria-checked 가 전달한다
      // ("다크 모드, 스위치, 선택됨/선택 안 됨").
      aria-label="다크 모드"
      onClick={toggle}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          <IconSun />
          <IconMoon />
        </span>
      </span>
      {/* 두 문구를 같은 그리드 칸에 겹쳐 둔다 — 폭이 넓은 쪽으로 고정되어 상태가 바뀌어도
          컨테이너 크기가 변하지 않는다. 색만이 아니라 문구로도 상태를 구분한다. */}
      <span className="theme-toggle-text" aria-hidden="true">
        <span data-when="light">라이트</span>
        <span data-when="dark">다크</span>
      </span>
    </button>
  );
}
