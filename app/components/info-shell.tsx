// 정보 페이지 공용 셸 (#9). 서버 컴포넌트 — 게이트 없이 공개 접근(#6 정책의 "공개 소개 페이지").
// 메인 데모(6단계 흐름)는 렌더하지 않으며, 데모 진입은 항상 게이트를 거친다.
import BrandGlyph from "./brand-mark";
import MobileDrawerNav from "./mobile-drawer-nav";
import ThemeToggle from "./theme-toggle";
import { NAV_ITEMS, type InfoPageKey } from "./site-nav";

export type { InfoPageKey };

export function InfoShell({
  active,
  eyebrow,
  title,
  lead,
  children,
}: {
  active: InfoPageKey | null; // privacy·terms처럼 상단 내비에 없는 페이지는 null
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#main">본문으로 건너뛰기</a>
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
          <ThemeToggle />
        </nav>
        <MobileDrawerNav active={active} />
      </header>

      <main id="main">

      <section className="page-shell info-shell">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="info-lead">{lead}</p>
        {children}
        <div className="info-cta">
          <a className="primary info-demo-link" href="/demo">GapProof 데모 시작하기 <span>→</span></a>
          <a className="secondary info-sample-link" href="/demo?sample=1">코드 없이 샘플 둘러보기</a>
          <small>실제 분석은 심사·멘토링 공유용 데모 코드가 필요합니다.</small>
        </div>
      </section>

      </main>

      <footer className="site-footer">
        <p><b>GapProof</b> · Solar 기반 AI 진로상담 지원 프로토타입</p>
        <nav className="footer-nav" aria-label="정보 페이지">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          <a href="/privacy">개인정보 처리방침</a>
          <a href="/terms">이용약관</a>
        </nav>
        <p>취업 또는 적성 판정이 아닙니다</p>
      </footer>
    </>
  );
}
