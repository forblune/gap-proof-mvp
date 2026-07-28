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
//  - 로딩 표시로 쓰지 않는다. 애니메이션이 없어도 최종 모양이 그대로 남는다.
//  - 레이아웃을 움직이지 않는다(고정 viewBox·고정 크기, CLS 0).
//  - prefers-reduced-motion 이면 즉시 최종 정적 로고.
//  - 모바일에서는 지속 시간을 줄인다.

import { useEffect, useState } from "react";

// 움직임을 원하지 않는 사용자에게는 처음부터 최종 모양을 보여 준다.
// effect 안에서 동기 setState 를 하면 연쇄 렌더가 생기고, 한 프레임 동안 시작 모양이 스친다.
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// 가로획의 단계별 모양. viewBox 64×64, brand-mark.tsx 와 같은 좌표계.
const BAR_STEPS = [
  "M31 32 H47", // 1. 평범한 가로획
  "M31 32 H45 Q48 32 48.5 30", // 2. 끝이 꺾이기 시작
  "M31 32 H44 Q49.5 32 50.5 29", // 3. 곡선이 자란다
  "M31 32 H43 Q50 32 51.5 27.5", // 4. 최종
];

const STEP_MS = 300;

export function BrandMotion({ size = 40 }: { size?: number }) {
  // 초기값으로 결정한다 — 서버 렌더에서는 false 이므로 첫 클라이언트 렌더에서 확정된다.
  const [step, setStep] = useState(() => (prefersReducedMotion() ? BAR_STEPS.length - 1 : 0));
  const [headIn, setHeadIn] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const narrow = typeof window !== "undefined" && window.innerWidth < 720;
    const unit = narrow ? STEP_MS * 0.7 : STEP_MS;
    const timers: number[] = [];
    for (let index = 1; index < BAR_STEPS.length; index++) {
      timers.push(window.setTimeout(() => setStep(index), unit * index));
    }
    // 화살촉은 곡선이 자란 뒤에 드러난다 — 마지막이 "완성" 이어야 의미가 맞다.
    timers.push(window.setTimeout(() => setHeadIn(true), unit * BAR_STEPS.length));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

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
        <path
          d="M33.7 12.1 A20 20 0 1 0 48.4 43.5"
          fill="none"
          stroke="var(--brand-stroke, url(#gp-motion-gradient))"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        <path
          d={BAR_STEPS[step]}
          fill="none"
          stroke="var(--brand-stroke, url(#gp-motion-gradient))"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          className={`brand-motion-head${headIn ? " is-in" : ""}`}
          points="58,20 56.3,32.3 45.7,21.7"
          fill="var(--brand-stroke, url(#gp-motion-gradient))"
        />
      </svg>
    </span>
  );
}
