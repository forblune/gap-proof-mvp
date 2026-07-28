// GapProof 브랜드 심벌 — 대문자 G, 열린 원, 끊긴 곳을 잇는 획.
//
// 의미:
//   원      = 경험 → 근거 → 보완 → 기록의 순환
//   끊긴 곳 = 아직 정리되지 않은 간격(Gap)
//   틸 획   = 그 간격을 근거로 잇는 과정(Proof). 링과 같은 반지름·굵기로 이어 붙어
//             "따로 붙은 장식"이 아니라 "원을 완성하는 조각"으로 읽힌다.
//
// 사양과 다르게 한 것: 열린 끝에 화살촉을 두지 않았다.
// 실제로 그려 보니 읽히는 크기의 화살촉은 링 + 화살촉 = 새로고침 아이콘으로 읽히고,
// 새로고침으로 보이지 않을 만큼 작게 하면 큰 크기에서 브리지에 흡수돼 혹처럼 보였다.
// 둘 다 사양이 금지한 결과이므로, 방향은 정적 심벌이 아니라 모션에서 표현한다.
//
// 색: 본체는 currentColor(테마·인쇄 반전 대응), 잇는 획은 .mark-bridge(CSS)로 칠한다.
// 단색으로 써야 하는 자리에서는 .mark-bridge 를 currentColor 로 두면 된다.
export default function BrandGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {/* 열린 원 — 왼쪽 위가 끊겨 있다 */}
      <path
        d="M32 12 A20 20 0 1 1 17.9 18.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* G의 가로획 */}
      <path
        d="M34 33 H52 V39"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 끊긴 곳을 잇는 획 — 링과 같은 반지름·굵기라 "원을 완성하는 조각"으로 읽힌다 */}
      <path className="mark-bridge" d="M17.9 18.1 A20 20 0 0 1 32 12" fill="none" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
