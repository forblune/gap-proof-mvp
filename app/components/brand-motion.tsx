// GapProof 키네틱 워드마크 — G 의 가로획 끝에서 화살표가 자라난다.
//
// 흐름(4단계):
//   1. 짧은 가로획 끝에 작은 화살촉 — 이미 화살표다, 다만 아직 작다
//   2. 획이 길어지고 촉이 커지며 위로 들리기 시작
//   3. 곡선이 자라며 각이 붙는다
//   4. 완성 — 순환이 아니라 연결
//
// **이전 설계의 결함(실제 지적):** 예전에는 가로획만 4단계로 바꾸고 화살촉은 마지막에 나타났다
// (`0%, 74.9% { opacity: 0 }`). 그래서 1.2초 중 0.9초 동안 화살표 없이 획만 꿈틀거려
// "지렁이 같다"고 읽혔다. 지금은 **모든 단계가 (획 + 촉) 한 쌍**이다. 어느 프레임을 멈춰 세워도
// 화살표로 읽히고, 자라는 과정만 보인다. 한 쌍을 <g> 하나로 묶었으므로 획과 촉이 어긋날 수 없다.
//
// 원칙:
//  - 첫 진입 1회. 무한 반복하지 않는다(animation-iteration-count 기본값 1).
//  - 로딩 표시로 쓰지 않는다. 로딩은 .spinner 가 따로 맡는다.
//  - **애니메이션이 없어도 최종 모양이 그대로 남는다.**
//  - 레이아웃을 움직이지 않는다(고정 viewBox·고정 크기, CLS 0).
//  - prefers-reduced-motion 이면 즉시 최종 정적 로고.
//  - 모바일에서는 지속 시간을 줄인다(globals.css 의 미디어 쿼리).
//
// 왜 JS 를 쓰지 않는가:
// 처음에는 "현재 단계"를 state 로 들고 d 속성을 갈아 끼웠다. 그런데 d 는 CSS 로 바꿀 수 없어서
// 서버 렌더 결과가 1단계로 굳고, JS 실행 전이나 reduced-motion 사용자에게 **화살표 없는 다른 로고**가
// 남았다. 이를 피하려고 초기값을 최종 단계로 두자 이번에는 첫 페인트에 완성형이 보였다가
// 마운트 직후 1단계로 되돌아가, 로고가 깨졌다 낫는 것처럼 보였다(심사에서 지적).
//
// 두 문제 모두 "언제 JS 가 도느냐"에서 나온다. 그래서 4단계를 전부 그려 두고 전환은 CSS 애니메이션에
// 맡긴다. 정적 기본값이 곧 최종 모양이므로 JS 가 없어도, 늦게 실행돼도, 아예 꺼져 있어도 결과가 같다.

// 단계별 (가로획, 화살촉). viewBox 64×64, brand-mark.tsx 와 같은 좌표계.
// 마지막 원소는 brand-mark.tsx 와 정확히 같아야 한다 — 애니메이션이 끝나면 정적 심벌과
// 구분되지 않아야 하기 때문이다.
// 화살촉 축이 0° → 12° → 22° → 30° 로 들리면서 촉도 함께 커진다.
// 각 단계의 획 끝에는 그 단계의 축과 나란한 짧은 직선 구간이 있다(촉이 획에 얹히도록).
const STEPS = [
  { bar: "M31 32 H39.5", head: "50.5,32 39.5,38.6 42.3,32 39.5,25.4" },
  { bar: "M31 32 H38.5 Q41 32 43.93 31.38 L45.5 31.04", head: "58.22,28.34 47.1,38.58 48.73,30.36 43.9,23.51" },
  { bar: "M31 32 H38 Q41.5 32 44.75 30.69 L46.41 30.01", head: "60.14,24.47 49.67,38.08 49.94,28.59 43.15,21.95" },
  { bar: "M31 32 H38 Q42 32 45.46 30 L47.2 29", head: "61.49,20.75 52,37.31 50.83,26.9 42.4,20.69" },
];

export function BrandMotion({ size = 40 }: { size?: number }) {
  const paint = "var(--brand-stroke, url(#gp-motion-gradient))";
  return (
    <span className="brand-motion" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          {/* userSpaceOnUse — 링·획·촉이 하나의 색 흐름을 공유한다. 이유는 brand-mark.tsx 주석 참고. */}
          <linearGradient id="gp-motion-gradient" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="58" y2="54">
            <stop offset="0%" stopColor="var(--color-brand-indigo)" />
            <stop offset="55%" stopColor="var(--color-brand-mid)" />
            <stop offset="100%" stopColor="var(--color-brand-green)" />
          </linearGradient>
        </defs>
        {/* 링 — 오른쪽이 열린 G. 단계와 무관하게 고정이다. */}
        <path
          d="M33.6 13.1 A19 19 0 1 0 47.6 42.9"
          fill="none"
          stroke={paint}
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        {/* 4단계를 모두 그려 두고, 보이는 것은 CSS 가 고른다. */}
        {STEPS.map((step, index) => (
          <g key={step.bar} className="brand-motion-step" data-step={index}>
            <path
              d={step.bar}
              fill="none"
              stroke={paint}
              strokeWidth="8.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon points={step.head} fill={paint} />
          </g>
        ))}
      </svg>
    </span>
  );
}
