"use client";

// 기술 스택이 "한곳으로 모이는" 시각화.
// 흩어져 있던 조각들이 가운데(GapProof)로 모여 하나의 고리를 이룬다 —
// 흩어진 경험을 증거 하나로 모으는 이 서비스가 하는 일을 그대로 보여 준다.
//
// 설계 원칙:
//  - 모인 뒤에도 각 기술 이름이 또렷하게 읽혀야 한다(흐려서 사라지게 하지 않는다).
//  - 그림 자체가 목록이다. 스크린리더와 검색엔진에도 같은 이름이 텍스트로 전달된다.
//  - prefers-reduced-motion이면 움직임 없이 최종 배치로 바로 보여 준다.
//  - JS가 없어도 이름은 그대로 읽힌다(최종 위치가 CSS 기본값이다).

import { useEffect, useRef, useState } from "react";

export type StackNode = {
  /** 화면에 보이는 짧은 이름 */
  short: string;
  /** 접근성·SEO에 쓰이는 전체 이름과 역할 */
  label: string;
};

export function StackConverge({ nodes }: { nodes: StackNode[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [converged, setConverged] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!element || reduced || typeof IntersectionObserver === "undefined") {
      setConverged(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setConverged(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`stack-converge ${converged ? "is-converged" : ""}`}
      role="list"
      aria-label="GapProof를 이루는 기술"
    >
      <p className="stack-converge-core" aria-hidden="true">
        <b>GapProof</b>
        <small>증거 하나로</small>
      </p>
      {nodes.map((node, index) => {
        // 바깥 원에서 출발해 안쪽 고리로 모인다. 최종 위치도 겹치지 않게 각도로 배분한다.
        const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <span
            key={node.short}
            className="stack-converge-node"
            role="listitem"
            style={
              {
                "--from-x": `${Math.cos(angle) * 180}px`,
                "--from-y": `${Math.sin(angle) * 180}px`,
                "--to-x": `${Math.cos(angle) * 104}px`,
                "--to-y": `${Math.sin(angle) * 104}px`,
                "--delay": `${index * 80}ms`,
              } as React.CSSProperties
            }
          >
            {/* 짧은 이름은 눈으로, 전체 이름은 스크린리더·검색엔진으로 */}
            <span aria-hidden="true">{node.short}</span>
            <span className="sr-only">{node.label}</span>
          </span>
        );
      })}
    </div>
  );
}
