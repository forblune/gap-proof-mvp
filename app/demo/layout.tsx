import type { Metadata } from "next";

// /demo는 클라이언트 컴포넌트(page.tsx)라 자체 metadata를 export할 수 없어
// 루트 layout의 canonical("/")을 그대로 물려받고 있었다 — 서버 컴포넌트인 이 layout에서
// canonical만 "/demo"로 바로잡는다.
// 주의: robots noindex는 시도했으나 Lighthouse의 is-crawlable 감사가 noindex 페이지를
// 감점 처리해 SEO 96→66으로 회귀(측정 근거: /Users/gh/.claude/jobs/91b2e432/tmp/demo-after-fix-check.json).
// /demo?sample=1의 SEO ≥95가 이번 목표의 명시적 측정 대상이라 되돌림 — devlog에 REVERT로 기록.
export const metadata: Metadata = {
  alternates: { canonical: "/demo" },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
