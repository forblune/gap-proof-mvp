// GapProof 키네틱 워드마크 — G 의 가로획 끝에서 화살표가 자라난다.
//
// 흐름(브랜드 사양의 4단계):
//   1. G 를 먼저 알아본다 — 가로획이 ㄱ 자로 끝난 평범한 G
//   2. ㄱ자 지점이 전환점이 된다 — 끝이 위로 꺾이기 시작
//   3. 자연스러운 곡선으로 방향이 생긴다
//   4. 화살촉이 드러나며 완성 — 순환이 아니라 연결
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

// 가로획의 단계별 모양. viewBox 64×64, brand-mark.tsx 와 같은 좌표계.
// 마지막 원소는 brand-mark.tsx 의 가로획과 정확히 같아야 한다(애니메이션이 끝나면 정적 심벌과 구분되지 않아야 하므로).
const BAR_STEPS = [
  "M31 32 H47", // 1. 평범한 가로획
  "M31 32 H45 Q48 32 48.5 30", // 2. 끝이 꺾이기 시작
  "M31 32 H44 Q49.5 32 50.5 29", // 3. 곡선이 자란다
  "M31 32 H43 Q50 32 51.5 27.5", // 4. 최종 — brand-mark.tsx 와 동일
];

export function BrandMotion({ size = 40 }: { size?: number }) {
  const paint = "var(--brand-stroke, url(#gp-motion-gradient))";
  return (
    <span className="brand-motion" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="gp-motion-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-indigo)" />
            <stop offset="55%" stopColor="var(--color-brand-mid)" />
            <stop offset="100%" stopColor="var(--color-brand-green)" />
          </linearGradient>
        </defs>
        {/* 링 — 오른쪽이 열린 G */}
        <path
          d="M33.7 12.1 A20 20 0 1 0 48.4 43.5"
          fill="none"
          stroke={paint}
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        {/* 가로획 4단계를 모두 그려 두고, 보이는 것은 CSS 가 고른다. */}
        {BAR_STEPS.map((d, index) => (
          <path
            key={d}
            className="brand-motion-bar"
            data-bar={index}
            d={d}
            fill="none"
            stroke={paint}
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* 화살촉은 곡선이 자란 뒤에 드러난다 — 마지막이 "완성" 이어야 의미가 맞다. */}
        <polygon className="brand-motion-head" points="58,20 56.3,32.3 45.7,21.7" fill={paint} />
      </svg>
    </span>
  );
}
