// Issue #24: 확정 브랜드 심볼(A1 Broken G Bridge).
// G의 개구부(간극)를 노란 브리지가 잇는 구조 — .brand-mark 컨테이너 안에서 사용.
// 본체는 currentColor, 브리지는 .mark-bridge(CSS)로 칠해 인쇄 반전(#26)에도 대응한다.
export default function BrandGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M 46.85 46.85 A 21 21 0 1 1 46.85 17.15" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
      <rect x="33" y="32.5" width="15.5" height="11" rx="3" fill="currentColor" />
      <rect className="mark-bridge" x="41.35" y="7" width="11" height="30" rx="5.5" />
    </svg>
  );
}
