// GapProof 브랜드 심벌 — 대문자 G, 가로획 끝에서 자라나는 화살표.
//
// 의미:
//   G의 원 = 흩어진 경험을 담는 자리
//   가로획 = 그 안에서 정리된 근거
//   화살표 = 가로획 끝(ㄱ자 지점)에서 자연스럽게 자라 나오는 다음 걸음
//
// 핵심은 **순환이 아니라 연결**이다. 화살표가 링을 따라 돌면 새로고침·동기화 아이콘이 되고,
// 브랜드가 아니라 시스템 아이콘으로 읽힌다. 그래서 화살표는 링을 돌지 않고 가로획에서
// 바깥 위쪽으로 뻗는다 — 붙인 장식이 아니라 구조에서 자라난 형태다.
//
// 형태 판단 근거(실제 렌더 비교):
//   - 링 개구가 좁으면(위쪽 끝과 가로획 사이 여백 5px) 소문자 e 로 읽혔다.
//     개구를 -85°→35° 로 넓혀 여백 11.4px 를 확보했다.
//   - 화살촉을 획(stroke)으로 그리면 굵기 때문에 뭉개진다. 채움 삼각형으로 그린다.
//
// 색: 기본은 인디고→그린 그라데이션. 단색이 필요한 자리(인쇄·다크 칩·시스템 아이콘)는
// CSS 에서 --brand-stroke 를 지정하면 그 색 하나로 그려진다.
export default function BrandGlyph({ gradientId = "gp-brand-gradient" }: { gradientId?: string } = {}) {
  const paint = `var(--brand-stroke, url(#${gradientId}))`;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-indigo)" />
          <stop offset="55%" stopColor="var(--color-brand-mid)" />
          <stop offset="100%" stopColor="var(--color-brand-green)" />
        </linearGradient>
      </defs>
      {/* 링 — 오른쪽이 열린 G */}
      <path d="M33.7 12.1 A20 20 0 1 0 48.4 43.5" fill="none" stroke={paint} strokeWidth="8.5" strokeLinecap="round" />
      {/* 가로획 → 화살표 몸통 */}
      <path
        d="M31 32 H43 Q50 32 51.5 27.5"
        fill="none"
        stroke={paint}
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 화살촉 */}
      <polygon points="58,20 56.3,32.3 45.7,21.7" fill={paint} />
    </svg>
  );
}
