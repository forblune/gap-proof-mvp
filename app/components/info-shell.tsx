// 정보 페이지 공용 셸 (#9). 서버 컴포넌트 — 게이트 없이 공개 접근(#6 정책의 "공개 소개 페이지").
// 메인 데모(5단계 흐름)는 렌더하지 않으며, 데모 진입은 항상 게이트를 거친다.
import BrandGlyph from "./brand-mark";

const NAV_ITEMS = [
  { href: "/about", label: "소개" },
  { href: "/guide", label: "이용 가이드" },
  { href: "/how-it-works", label: "작동 원리" },
  { href: "/technology", label: "기술과 검증" },
] as const;

export type InfoPageKey = (typeof NAV_ITEMS)[number]["href"];

export function InfoShell({
  active,
  eyebrow,
  title,
  lead,
  children,
}: {
  active: InfoPageKey;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <main>
      <header className="topbar info-bar">
        <a className="brand" href="/" aria-label="GapProof 홈으로 이동">
          <span className="brand-mark"><BrandGlyph /></span>
          <span>GapProof</span>
        </a>
        <nav className="info-nav" aria-label="정보 페이지">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} aria-current={item.href === active ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="page-shell info-shell">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="info-lead">{lead}</p>
        {children}
        <div className="info-cta">
          <a className="primary info-demo-link" href="/demo">GapProof 데모 시작하기 <span>→</span></a>
          <small>데모는 심사·멘토링 공유용 접근 코드가 필요해요.</small>
        </div>
      </section>

      <footer className="site-footer">
        <p><b>GapProof</b> · Solar 기반 AI 진로상담 지원 프로토타입</p>
        <p>취업 또는 적성 판정이 아닙니다</p>
      </footer>
    </main>
  );
}
