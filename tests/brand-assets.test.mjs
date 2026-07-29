// 로고 좌표가 파일마다 갈라지는 것을 막는다.
//
// 실제로 있던 문제: 배포된 로고가 **네 가지**였다.
//   - app/components/brand-mark.tsx     링 r=20 · 화살촉 밑변 15.0
//   - public/favicon.svg                같은 좌표에 scale(0.75) 를 한 번 더 걸어 더 작았다
//   - public/icon-192/512/maskable      화살촉이 떨어져 나온 얼룩 — 화살표로 읽히지 않았다
//   - public/og.png                     또 다른 좌표·다른 색
// 아무도 눈치채지 못한 이유는 "같아야 한다"고 주석에만 적혀 있었기 때문이다.
//
// 원본은 scripts/build-brand-assets.mjs 의 GLYPH 하나다. 이 테스트는 앱 컴포넌트와
// favicon.svg 가 그 원본과 같은 좌표를 쓰는지 확인한다. PNG 자산은 그 스크립트가 생성하므로
// 스크립트를 다시 실행하면 자동으로 따라온다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLYPH } from "../scripts/build-brand-assets.mjs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const MARK = read("../app/components/brand-mark.tsx");
const MOTION = read("../app/components/brand-motion.tsx");
const FAVICON = read("../public/favicon.svg");

test("정적 심벌이 원본 좌표와 같다", () => {
  for (const [name, value] of Object.entries({ ring: GLYPH.ring, bar: GLYPH.bar, head: GLYPH.head })) {
    assert.ok(MARK.includes(value), `brand-mark.tsx 에 원본의 ${name} 좌표가 없습니다: ${value}`);
  }
});

test("애니메이션의 마지막 단계가 정적 심벌과 같다 — 재생이 끝나면 구분되지 않아야 한다", () => {
  assert.ok(MOTION.includes(GLYPH.ring), "brand-motion.tsx 의 링이 원본과 다릅니다");
  // STEPS 배열의 마지막 원소만 검사한다(앞 단계는 자라는 중이라 달라야 한다).
  const steps = [...MOTION.matchAll(/\{\s*bar:\s*"([^"]+)",\s*head:\s*"([^"]+)"\s*\}/g)];
  assert.equal(steps.length, 4, `애니메이션 단계가 4개여야 합니다(현재 ${steps.length}개)`);
  const [, lastBar, lastHead] = steps[steps.length - 1];
  assert.equal(lastBar, GLYPH.bar, "마지막 단계의 가로획이 정적 심벌과 다릅니다");
  assert.equal(lastHead, GLYPH.head, "마지막 단계의 화살촉이 정적 심벌과 다릅니다");
});

test("모든 애니메이션 단계에 화살촉이 있다 — 없으면 '지렁이'로 읽힌다", () => {
  const steps = [...MOTION.matchAll(/\{\s*bar:\s*"([^"]+)",\s*head:\s*"([^"]+)"\s*\}/g)];
  for (const [index, [, , head]] of steps.entries()) {
    const points = head.trim().split(/\s+/);
    assert.ok(points.length >= 3, `${index + 1}단계에 화살촉이 없거나 점이 부족합니다: "${head}"`);
  }
});

test("favicon.svg 가 원본 좌표를 쓴다", () => {
  for (const [name, value] of Object.entries({ ring: GLYPH.ring, bar: GLYPH.bar, head: GLYPH.head })) {
    assert.ok(FAVICON.includes(value), `favicon.svg 에 원본의 ${name} 좌표가 없습니다`);
  }
});

test("화살촉이 획보다 확실히 넓다 — 좁으면 화살표로 읽히지 않는다", () => {
  // 촉의 가장 넓은 지점(뒤쪽 두 점 사이 거리)이 획 굵기의 최소 1.8배여야 한다.
  // 예전 촉은 밑변 15.0 / 획 8.5 = 1.76 배였고, 그마저 둥근 끝에 가려 2.3px 만 보였다.
  const pts = GLYPH.head.trim().split(/\s+/).map((p) => p.split(",").map(Number));
  let widest = 0;
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      widest = Math.max(widest, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
    }
  }
  // 가장 먼 두 점은 보통 꼭짓점↔뒤쪽 모서리라 촉 길이에 가깝다. 폭은 뒤쪽 두 모서리 사이로 잰다.
  const back = pts.filter((_, i) => i !== 0); // 첫 점이 꼭짓점
  let span = 0;
  for (let i = 0; i < back.length; i += 1) {
    for (let j = i + 1; j < back.length; j += 1) {
      span = Math.max(span, Math.hypot(back[i][0] - back[j][0], back[i][1] - back[j][1]));
    }
  }
  assert.ok(span >= GLYPH.strokeWidth * 1.8,
    `화살촉 폭 ${span.toFixed(1)} 이 획 ${GLYPH.strokeWidth} 의 1.8배(${(GLYPH.strokeWidth * 1.8).toFixed(1)}) 미만입니다`);
});

test("잉크 경계가 viewBox 64 를 넘지 않는다 — 넘으면 잘린다", () => {
  const { x0, y0, x1, y1 } = GLYPH.box;
  assert.ok(x0 >= 0 && y0 >= 0, "잉크가 viewBox 왼쪽/위로 벗어납니다");
  assert.ok(x1 <= 64 && y1 <= 64, `잉크가 viewBox 오른쪽/아래로 벗어납니다 (x1=${x1}, y1=${y1})`);
  // 실제 좌표에서 경계를 다시 계산해 box 선언이 거짓말하지 않는지 본다.
  const headXs = GLYPH.head.trim().split(/\s+/).map((p) => Number(p.split(",")[0]));
  assert.ok(Math.max(...headXs) <= x1 + 0.01,
    `선언한 box.x1(${x1}) 이 실제 화살촉 오른쪽 끝(${Math.max(...headXs)})보다 작습니다`);
});
