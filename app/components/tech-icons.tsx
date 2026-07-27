// 기술 스택 표시용 아이콘 — /technology "실제 기술 스택" 카드에서 각 기술을 한눈에 구분하기 위한
// 대표 마크. 외부 아이콘 라이브러리·공식 브랜드 SVG를 그대로 가져오지 않고, fact-icons.tsx와 동일한
// 톤(24x24 · stroke currentColor · strokeWidth 1.75 · round cap/join)으로 각 기술을 연상시키는
// 최소한의 선화로 새로 그렸다.

const base = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Next.js — 원 안에 대각선(N)과 우측 상단이 끊긴 짧은 세로선으로 로고의 인상을 압축
export function IconNextjs() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 8v8M8.5 8l7 8M15.5 8v5.5" />
    </svg>
  );
}

// React — 중심점을 공유하는 타원 3개(원자 궤도) 배치
export function IconReact() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
}

// Cloudflare — 구름 윤곽 + 우하단 플레어(불꽃) 쐐기로 브랜드 마크의 특징적인 절개부를 반영
export function IconCloudflare() {
  return (
    <svg {...base}>
      <path d="M16.6 15.8H7.1a3.6 3.6 0 0 1-.4-7.17 5 5 0 0 1 9.65-1.66A3.7 3.7 0 0 1 20 10.4a3.7 3.7 0 0 1-1.2 2.72" />
      <path d="M14.6 15.8l1.6-2.9h2.1l-1.2 2.9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Solar(Upstage) — 태양
export function IconSolar() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" />
    </svg>
  );
}

// Node.js — 입체감 있는 육각형(볼트 형태) — 안쪽 능선으로 Node 마크 특유의 각진 음영을 표현
export function IconNode() {
  return (
    <svg {...base}>
      <path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4Z" />
      <path d="M12 9v6M8 7l4 2 4-2M8 17l4-2 4 2" />
    </svg>
  );
}
