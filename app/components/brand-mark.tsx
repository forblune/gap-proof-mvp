// GapProof 브랜드 심벌 — 대문자 G, 가로획 끝에서 자라나는 화살표.
//
// 의미:
//   G의 원 = 흩어진 경험을 담는 자리
//   가로획 = 그 안에서 정리된 근거
//   화살표 = 가로획 끝에서 자연스럽게 자라 나오는 다음 걸음
//
// 핵심은 **순환이 아니라 연결**이다. 화살표가 링을 따라 돌면 새로고침·동기화 아이콘이 되고,
// 브랜드가 아니라 시스템 아이콘으로 읽힌다. 그래서 화살표는 링을 돌지 않고 가로획에서
// 바깥 위쪽으로 뻗는다 — 붙인 장식이 아니라 구조에서 자라난 형태다.
//
// 형태 판단 근거(실제 렌더 비교):
//   - 링 개구가 좁으면(위쪽 끝과 가로획 사이 여백 5px) 소문자 e 로 읽혔다.
//     개구를 -85°→35° 로 넓혀 여백을 확보했다.
//   - 화살촉을 획(stroke)으로 그리면 굵기 때문에 뭉개진다. 채움 삼각형으로 그린다.
//   - **화살촉이 획에 먹히면 안 된다.** 이전 삼각형은 밑변 15.0 · 높이 9.9 로 납작한데
//     획 굵기 8.5(둥근 끝 반지름 4.25)의 끝이 삼각형 밑변 한가운데 있었다. 그래서 획 밖으로
//     나오는 부분이 5.65 뿐이었고, 실제 렌더 크기(약 26px)에서는 2.3px — 화살표가 보이지 않고
//     'G에 꼬리가 달린' 모양으로 읽혔다.
//     지금은 촉의 폭이 획의 2.2배다. 화살표는 몸통보다 촉이 확실히 넓어야 화살표로 읽힌다.
//     링 반지름을 20→19 로 줄여 그 자리를 만들었다.
//   - **획과 촉의 각도를 맞춰야 한다.** 밑변이 평평한 삼각형을 붙였더니 아래로 얇은 가시가
//     튀고 위로는 홈이 생겼다 — 획은 시각적으로 거의 수평인데 촉만 30° 기울어서다.
//     그래서 획 끝에 축(30°)과 나란한 짧은 직선 구간(`L 47.2 29`)을 두고, 촉은 뒤가 파인
//     4점 화살촉으로 바꿨다. 촉이 획 위에 자연스럽게 얹히고 가시가 사라진다.
//
// 색: 기본은 인디고→그린 그라데이션. 단색이 필요한 자리(인쇄·다크 칩·시스템 아이콘)는
// CSS 에서 --brand-stroke 를 지정하면 그 색 하나로 그려진다.
//
// 그라데이션은 **userSpaceOnUse** 로 둔다. 기본값(objectBoundingBox)은 요소마다 제 경계상자에
// 맞춰 색을 다시 매핑해서, 큰 링과 작은 가로획이 서로 다른 구간의 색으로 칠해진다 —
// 이음매에서 색이 눈에 띄게 어긋났다. 좌표를 고정하면 링·획·촉이 하나의 색 흐름을 공유한다.
export default function BrandGlyph({ gradientId = "gp-brand-gradient" }: { gradientId?: string } = {}) {
  const paint = `var(--brand-stroke, url(#${gradientId}))`;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="58" y2="54">
          <stop offset="0%" stopColor="var(--color-brand-indigo)" />
          <stop offset="55%" stopColor="var(--color-brand-mid)" />
          <stop offset="100%" stopColor="var(--color-brand-green)" />
        </linearGradient>
      </defs>
      {/* 링 — 오른쪽이 열린 G */}
      <path d="M33.6 13.1 A19 19 0 1 0 47.6 42.9" fill="none" stroke={paint} strokeWidth="8.5" strokeLinecap="round" />
      {/* 가로획 → 화살표 몸통. 끝의 L 구간이 화살촉 축(30°)과 나란하다. */}
      <path
        d="M31 32 H38 Q42 32 45.46 30 L47.2 29"
        fill="none"
        stroke={paint}
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 화살촉 — brand-motion.tsx 의 마지막 단계, scripts/build-brand-assets.mjs 와 좌표가 정확히 같아야 한다. */}
      <polygon points="61.49,20.75 52,37.31 50.83,26.9 42.4,20.69" fill={paint} />
    </svg>
  );
}
