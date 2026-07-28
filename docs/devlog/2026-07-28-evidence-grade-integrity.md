# 증거등급 무결성 P0 수정 개발일지 (2026-07-28)

## 목표

`docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md`에서 확정된 두 P0 CONFLICT를 최소 범위로 수정한다.
1. 퀴즈 통과만으로 증거등급이 Lv.3 "수행 확인"까지 올라갈 수 있는 문제
2. 확인된 증거가 0개인데도 STEP4→5 진행이 가능한 문제

main 병합·운영 배포는 하지 않는다.

## 시작 전 확인

- `main` = `38a8274ab11225f2763a93a54d7601f5158fd943`(예상과 일치), `git status` clean.
- PR #80(`feat/competition-about`) — OPEN·Ready·HEAD `b4fdd88ae6ac787461b783634d471121b87283ba`(예상과 일치) — 이번 작업에서 수정하지 않았다.
- `origin/main`에서 새 브랜치 `fix/evidence-grade-integrity` 생성.

## Superpowers 적용 방식

`brainstorming` 단계는 코드를 직접 추적하는 방식으로 수행했다(아래 "발견한 기존 문제" 참고). `writing-plans`는 별도 plan 문서 파일 대신, 이 devlog 상단의 problem/원칙/변경/테스트/rollback 구조로 압축해 담았다 — 이전 목표들과 동일하게, `/goal` 자체가 이미 상세한 스펙(정확한 UI 문구 예시, 필수 테스트 목록)을 담고 있어 별도 대화형 브레인스토밍이 필요한 미결정 사항이 없었기 때문이다. `executing-plans`는 실제로 한 세션(본 세션)만 코드를 수정했고, 4개 리뷰 관점(Product Logic·Engineering·Accessibility·Skeptical Competition)은 전부 읽기 전용 Agent로 위임했다.

## 발견한 기존 문제 (brainstorming)

`app/lib/engine.ts:74`(수정 전) — `if (passed[comp.id]) best = Math.max(best, 3);` — 확인된 증거와 무관하게 퀴즈 통과만으로 등급 3에 도달. 같은 파일 51행 자체 주석("수행 확인(Lv.2)·기관 확인(Lv.3)은 MVP 범위 밖이므로 임의로 올리지 않는다")과 정면 모순.

`app/demo/page.tsx`(수정 전) — STEP4→5 게이트: `disabled={confirmedClaims.length === 0 && passedComps.length === 0}` — 퀴즈만 통과해도(`passedComps.length > 0`) 확인 증거 0개 상태로 진행 가능.

**추가 발견(코드 추적 중 새로 확인, 최초 스펙에는 없던 항목)**: STEP5 렌더 조건(`{journeyOpen && step === 5 && (...)}`)이 confirmedClaims를 전혀 확인하지 않는다 — draft 복원이나 상태 조작으로 `step`이 5로 설정되면 게이트를 완전히 우회한다. "URL 조작이나 상태 복원으로 gate를 우회할 수 없는지 확인"이라는 명시적 요구사항에 따라 이것도 막았다.

**리뷰 단계에서 추가로 발견된 문제(4개 리뷰 에이전트가 독립적으로 수렴)**: `passedComps`(퀴즈 통과 역량 목록)가 STEP4의 "확인된 현재 역량" 패널, STEP5 증거카드, 공유 카운트에서 여전히 **매칭되는 확인 증거 없이도** "수행 확인" 배지로 표시되고 있었다 — 계산 로직(`competencyStrength`)은 고쳤지만 표시 로직은 별개 코드 경로라 고쳐지지 않은 상태였다. 4개 리뷰 중 3개(Product Logic·Engineering 일부·Skeptical Competition)가 이를 지적했고, Skeptical Competition은 명시적으로 "P0-blocking, 이연 불가"로 판정했다 — 원래 버그와 동일한 주장("퀴즈만으로 수행 증거")이 계산이 아니라 화면에서 그대로 재현되고 있었기 때문이다. 즉시 반영했다(아래 "변경" 참고).

## 제품 원칙 (그대로 인용)

- Solar는 증거 후보와 원문 근거를 제안한다.
- 규칙 엔진이 형식을 검증한다.
- 사용자가 직접 확인한 증거만 격차 분석과 주간 행동에 사용한다.
- 퀴즈 통과·강의 수료만으로 강한 수행 증거가 생성돼서는 안 된다.
- Lv.3 "수행 확인"에는 실제 행동·산출물·경험과 연결된 사용자 확인 증거가 최소 1개 필요하다.

## 변경한 계산 규칙

`app/lib/engine.ts`:
- `hasConfirmedEvidenceFor(comp, confirmed)` 신규 export — 확인 증거 중 이 역량의 keywords와 매칭되는 것이 있는지 판정. `competencyStrength`와 `page.tsx`의 화면 표시가 **동일한 기준**을 쓰도록 공용화했다(리뷰에서 발견된 계산-표시 불일치를 근본적으로 막기 위함).
- `competencyStrength(comp, confirmed, passed)` — `passed[comp.id]`가 `true`여도, 이 역량에 매칭되는 확인 증거가 하나도 없으면 등급 3에 도달하지 않는다. 기존 `claim.tier + 1` 로직(Lv.0/Lv.1)은 변경하지 않았다.

## STEP4→5 최종 gate

`app/demo/page.tsx`:
- 진행 버튼 `disabled={confirmedClaims.length === 0}`(퀴즈 조건 제거).
- STEP4→5 게이트 우회 방지: draft 복원 시점에 `step===5`이면서 복원된 확인 증거가 0개면 즉시 STEP4로 낮춘다(첫 페인트 전, draft-restore effect 내부에서 clamp — 리뷰에서 지적된 "복원 후 잠깐 STEP5가 그려졌다가 되돌아가는" 깜빡임을 막기 위해 사후 보정이 아니라 복원 시점에 직접 처리).
- 추가 안전장치로, 어떤 경로로든 `step===5`이면서 `confirmedClaims.length===0`인 상태가 되면(예: 향후 코드 변경으로 새 진입 경로가 생기는 경우 대비) 즉시 STEP4로 되돌리는 `useEffect` 가드를 유지.
- STEP4 "확인된 현재 역량" 패널, STEP5 증거카드, 공유용 스킬 카운트는 이제 `verifiedPassedComps`(퀴즈 통과 **및** 매칭 확인 증거가 있는 역량만)를 사용 — `passedComps`(단순 퀴즈 통과 여부)는 차단 안내문의 문구 분기(사용자가 퀴즈는 통과했는데 왜 막혔는지 설명하기 위함)에만 남겨 두었다.
- 학습확인 통과 토스트(`submitCheck`)도 이 역량에 매칭 증거가 있을 때만 "수행 확인(Lv.2)으로 기록했습니다"라고 말하고, 없으면 "등급에는 반영되지 않았습니다"로 정정.
- `app/how-it-works/page.tsx`, `app/about/page.tsx`의 Lv.2 설명 문구에 "학습확인 통과만으로는 오르지 않는다"는 캐비앗을 추가(공개 설명 페이지가 계산 로직과 어긋나지 않도록).

## 사용자 안내 문구

STEP4 차단 시(`.zero-note`, `role="status"`): "다음 단계로 가려면 내 경험에서 확인할 수 있는 근거를 하나 이상 선택해 주십시오." + 퀴즈를 이미 통과한 경우 "학습확인은 이해도를 점검할 뿐, 그 자체로는 증거를 대신하지 않습니다." 판정 표현("틀렸다", "역량이 없다") 없음, 기존 디자인 시스템(`.zero-note`, `role="status"`)과 문체 그대로 사용.

## 테스트 결과

- 단위(`tests/engine.test.mjs`, 신규): 9개 전부 통과 — 요구된 5개 시나리오(evidence 0+fail, 0+pass, 1+기존조건, 제거 후 재해제, 회귀 없음) + 4개 보강 케이스.
- `tests/rendered-html.test.mjs`: 기존 소스 계약 테스트 1건을 새 안내문 문구에 맞게 갱신(기대값 약화 아님 — 동일한 "0개 확인 가드 존재" 검증을 새 문구로 재확인).
- E2E(`tests/e2e/evidence-gate.spec.ts`, 신규, Chromium·Firefox·WebKit): 7개 시나리오 × 3브라우저 = 21/21 통과 — 0개 차단, 퀴즈 통과 후에도 0개면 차단(실제로 퀴즈를 통과시켜 검증), 1개 확인 후 진행, 확인 취소 후 재차단, 안내문·키보드 포커스, 320px 모바일 오버플로 0, axe(wcag2a/aa) serious/critical 0.
- 전체 Playwright(기존 189 + 신규 21 = 210개, 3브라우저): **210/210 통과**, 회귀 없음.
- `npm test`(단위 55개, build 포함): 55/55 통과.
- `npm run lint`: 신규 오류 0(기존 4건만, 무관 파일).

## 독립 리뷰 결과 (4개 관점, 전부 읽기 전용)

- **Product Logic**: 초기 NEEDS REWORK(passedComps 표시 불일치 + 토스트 문구 불일치) → 반영 후 재검증 완료.
- **Engineering**: 초기 KEEP(조건부) — stale draft 복원 시 첫 페인트 후 짧게 STEP5가 보였다 STEP4로 튕기는 깜빡임 위험 지적, "복원 시점 clamp" 권장. 반영했다(아래 "하지 않은 범위"에 남은 테스트 격차 기록).
- **Accessibility**: KEEP, blocker 없음. `role="status"` 적절, 네이티브 `disabled` 확인, STEP4 heading에 포커스 이동 로직이 없다는 점을 nice-to-have로 기록(이번 범위에서는 최소 변경 원칙에 따라 추가하지 않음).
- **Skeptical Competition Reviewer**: 초기 NEEDS WORK(동일한 문제가 화면 표시 층에서 재현) → passedComps/verifiedPassedComps 분리 + 공개 페이지 문구 수정으로 반영.

반영 후 재검증(전체 테스트 재실행, 위 결과) 완료. **NEEDS REWORK 잔여 0건**(Accessibility의 nice-to-have 1건은 명시적으로 이번 범위 밖으로 남김).

## 하지 않은 범위 (명시)

- STEP3/STEP4 순서 변경, Learn Before Check 제거, 리터럴 `&ldquo;`/`&rdquo;` 정리, UI 전면 재설계, 신규 업로드 기능, Supabase/Solar 대규모 변경, Canva·Notion·Remotion 작업 — 전부 손대지 않음.
- PR #80(`feat/competition-about`) 수정·병합 없음. main 병합·운영 배포 없음.
- Engineering 리뷰가 제안한 "stale draft를 localStorage에 직접 시딩해 복원 시점 clamp를 정확히 재현하는 E2E 테스트"는 게이트 인증(HttpOnly 세션 쿠키) 없이는 신뢰성 있게 구성하기 어려워 이번 범위에서는 추가하지 않았다 — 대신 clamp 로직 자체는 구현했고(위 참고), 정상 플로우(샘플 여정)를 통한 게이트 우회 불가는 21개 E2E로 확인했다. 필요 시 후속 작업으로 남긴다.
- Accessibility 리뷰의 "STEP4 heading에 포커스 이동 ref 추가"(step5→4 자동 되돌림 시 스크린리더 사용자를 위한 개선) — nice-to-have로 분류, 이번 최소 범위 수정에서는 추가하지 않음.

## Rollback 방법

이 PR은 `app/lib/engine.ts`, `app/demo/page.tsx`, `app/about/page.tsx`, `app/how-it-works/page.tsx`, `package.json`(테스트 스크립트 1줄), `tests/rendered-html.test.mjs`(1줄), `tests/engine.test.mjs`(신규)·`tests/e2e/evidence-gate.spec.ts`(신규)만 변경한다. 병합 후 문제가 발견되면 이 커밋(들)을 되돌리는 것으로 충분하다 — 스키마 변경이나 데이터 마이그레이션이 없고, `draft.ts`의 저장 포맷(`DraftV1`)도 변경하지 않았다(clamp는 읽기 시점 로직일 뿐 저장 포맷과 무관).

## Git/PR

- 브랜치: `fix/evidence-grade-integrity`(`origin/main` `38a8274`에서 생성).
- main 직접 커밋 없음, PR #80 변경 없음, 병합·배포 없음, force-push/reset --hard 없음.
