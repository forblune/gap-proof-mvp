// #9/#68 공용 내비 데이터 — 서버 컴포넌트(데스크톱 내비·푸터)와 클라이언트(모바일 드로어)가 함께 쓴다.
export const NAV_ITEMS = [
  { href: "/why", label: "왜 GapProof인가" },
  { href: "/who", label: "누구를 위한가" },
  { href: "/guide", label: "이용 가이드" },
  { href: "/how-it-works", label: "작동 원리" },
  { href: "/technology", label: "기술과 검증" },
  { href: "/about", label: "소개" },
] as const;

export type InfoPageKey = (typeof NAV_ITEMS)[number]["href"];
