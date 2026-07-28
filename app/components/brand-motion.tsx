"use client";

// GapProof 키네틱 워드마크 — G 의 가로획 끝에서 화살표가 자라난다.
//
// 흐름(브랜드 사양의 4단계):
//   1. G 를 먼저 알아본다 — 가로획이 ㄱ 자로 끝난 평범한 G
//   2. ㄱ자 지점이 전환점이 된다 — 끝이 위로 꺾이기 시작
//   3. 자연스러운 곡선으로 방향이 생긴다
//   4. 화살촉이 드러나며 완성 — 순환이 아니라 연결
//
// 원칙:
//  - 총 1.2~1.8초, 첫 진입 1회. 무한 반복하지 않는다.
//  - 로딩 표시로 쓰지 않는다.
//  - **애니메이션이 없어도 최종 모양이 그대로 남는다.** 이게 이 파일의 가장 중요한 제약이다.
//  - 레이아웃을 움직이지 않는다(고정 viewBox·고정 크기, CLS 0).
//  - prefers-reduced-motion 이면 즉시 최종 정적 로고.
//  - 모바일에서는 지속 시간을 줄인다.
//
// 왜 단계별 <path> 를 전부 그려 놓고 CSS 로 고르는가:
// d 속성은 CSS 로 바꿀 수 없다. 그래서 "현재 단계"를 state 로 들고 d 를 갈아 끼우면,
// 서버 렌더 결과가 항상 1단계가 되어 **JS 가 실행되기 전이나 reduced-motion 사용자에게
// 화살표 없는 다른 로고**가 남는다(실제로 그렇게 만들었다가 잡았다).
// 4단계를 모두 그려 두고 표시 여부만 CSS 에 맡기면, JS 없이도 기본값이 최종 모양이다.

import { useEffect, useState } from "react";

// 가로획의 단계별 모양. viewBox 64×64, brand-mark.tsx 와 같은 좌표계.
// 마지막 원소가 최종 모양이며, brand-mark.tsx 의 가로획과 정확히 같아야 한다.
const BAR_STEPS = [
  "M31 32 H47", // 1. 평범한 가로획
  "M31 32 H45 Q48 32 48.5 30", // 2. 끝이 꺾이기 시작
  "M31 32 H44 Q49.5 32 50.5 29", // 3. 곡선이 자란다
  "M31 32 H43 Q50 32 51.5 27.5", // 4. 최종 — brand-mark.tsx 와 동일
];

const STEP_MS = 300;
const FINAL_STEP = BAR_STEPS.length - 1;

export function BrandMotion({ size = 40 }: { size?: number }) {
  // 서버 렌더와 첫 클라이언트 렌더는 반드시 최종 모양이어야 한다(위 주석 참고).
  // 재생은 마운트 후에만 시작하므로 hydration 불일치가 생기지 않는다.
  const [step, setStep] = useState(FINAL_STEP);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const narrow = window.innerWidth < 720;
    const unit = narrow ? STEP_MS * 0.7 : STEP_MS;
    // 재생을 시작할 때만 1단계로 되돌린다 — 되돌리지 못하면 그냥 최종 모양으로 남는다.
    setStep(0);
    const timers = BAR_STEPS.map((_, index) =>
      window.setTimeout(() => setStep(index), unit * index),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const paint = "var(--brand-stroke, url(#gp-motion-gradient))";
  return (
    <span className="brand-motion" data-step={step} style={{ width: size, height: size }}>
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
        {/* 가로획 4단계를 모두 그려 두고, 보이는 것만 CSS 가 고른다. */}
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
