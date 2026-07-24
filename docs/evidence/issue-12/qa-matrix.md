# Issue #12 Phase A — 로컬 사전 QA 검증표 (2026-07-25)

환경: 로컬 하네스(프로덕션 빌드 정적 서빙, Node) + 필요 시 workerd 실측 기록 참조. UPSTAGE 미설정(실 유료 Solar 호출 0건), 게이트는 테스트 전용 값. 기준 커밋 `966296b`.

## 1) 뷰포트 (viewport-matrix.json)

| 항목 | 360 | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| 가로 overflow | 0 | 0 | 0 | 0 | 0 |
| console error | 0 | 0 | 0 | 0 | 0 |
| 스켈레톤 | 1열 | 1열 | 1열 | 1열 | 3열(의도) |
| 기록삭제 44px | PASS | PASS | PASS | PASS | PASS |
| 핵심 버튼 44px | PASS | PASS | PASS | PASS | PASS |

## 2) 상태 경로 (state-matrix.json + 별도 실행)

| 경로 | 결과 | 근거 |
|---|---|---|
| 비인증 게이트 | PASS — 게이트만 렌더, 데모 미노출 | state-matrix |
| 게이트 오답 | PASS — `role=alert` "오류 접근 코드가 올바르지 않아요" | state-matrix |
| 인증 성공(Enter) | PASS — 메인 표시 | state-matrix |
| 정상 분석(sample) | PASS — 샘플 배지·strip 사유 표시 | state-matrix |
| 입력 오류(20자 미만) | PASS — 사유 힌트+버튼 비활성 | state-matrix |
| rate limit 429 | PASS — 총 11번째 429·Retry-After 60·화면 alert 표시 | state-matrix |
| binding 실패 503 | PASS — fail-closed 사유가 화면 alert로 표시, 비인증 401 선행 유지 | 별도 하네스(RATE_LIMIT_TEST_MODE) |
| PII 마스킹 | PASS — 화면에 원문 PII 0건 + 고지 문구 | state-matrix |
| Solar 미구성 sample 경로 | PASS — "키가 없어 규칙 기반 샘플" 명시 | state-matrix |
| 확인 역량 0개 | PASS — STEP2에서 선차단(비활성+안내). STEP3 가드는 UI 도달 불가·테스트로 검증(#5) | state-matrix + tests |
| 기록 삭제 취소·확인 | PASS — 확인 바·취소 포커스·Escape 복귀·확정 시 초기화 | state-matrix |
| 데모 잠금 | PASS — 게이트 복귀+안내 | state-matrix |

## 3) 접근성 (a11y-results.json)

| 항목 | 결과 |
|---|---|
| 키보드만으로 전체 흐름(게이트→카드) | PASS (Tab/Space/Enter로 완주, STEP4 포커스=H1) |
| 게이트 autofocus·Enter 제출 | PASS |
| focus-visible | PASS (outline 표시, 캡처 a11y-focus-visible.png) |
| Escape 취소+포커스 복귀 | PASS |
| aria-live/role=alert | PASS (오류 alert · 상태 status) |
| label·accessible name | PASS (미명명 요소 0건) |
| 터치 44px | PASS(핵심 동작) — 경미 예외 2건 아래 기록 |
| prefers-reduced-motion | PASS (transition 0s 적용) |

## 4) 인쇄 (print-results.json, print-step4*.pdf)

| 항목 | 결과 |
|---|---|
| 크롬 요소 숨김(헤더·진행·버튼·공유노트·푸터) | PASS |
| 카드·Gap Brief 표시, 빈 페이지 없음 | PASS (PDF 확인) |
| 날짜 | PASS — 생성 당일(2026.07.25) |
| 배경 미인쇄 시 목표직무 가독성 | **FAIL — 결함 후보 D1** (아래) |

## 5) Lighthouse 로컬 기준선 (lighthouse-local-baseline.json)

로컬 하네스 기준선 — **최종 프로덕션 점수 아님**(홈은 게이트 화면 기준, 서버는 단일 스레드 Node 하네스).

| 페이지 | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| / (게이트) | 67 | 95 | 100 | 100 |
| /about | 90 | 95 | 100 | 100 |

주요 감점: 홈 Perf는 하네스 서버 응답·하이드레이션 비용(로컬 요인 포함). A11y 95 감점 2건은 결함 후보 D2·D3.

## 6) 3분 시연 리허설 (rehearsal-runs.json)

- 시나리오: 게이트 → 경험 입력 → Solar 분석 → 사용자 확인(1 확인·1 거절) → 격차·행동 → 결과 카드 (`demo-script-3min.md`)
- 자동 주행 5/5 성공, 회당 3.9~5.1초(조작 시간) → 3분 내 발화·설명 여유 충분. 막힘 0건.
- 한계: 자동 주행 타이밍이며 실사용(발화 포함) 리허설·실기기 검증은 Phase B.

## 결함 후보 (수정은 후속 이슈 — QA 범위에서 미수정)

| # | 심각도 | 내용 | 근거 |
|---|---|---|---|
| D1 | P1(인쇄) | 배경 미인쇄(브라우저 기본) 시 개인 카드 `.identity` 흰 글씨(목표직무명)가 흰 종이에 비가시. `print-color-adjust` 또는 print 전용 색 반전 필요 | print-no-background-sim.png |
| D2 | P2(a11y) | muted 텍스트 2곳 대비 4.42~4.48로 기준(4.5) 미세 미달(`.info-cta small`, `.site-footer p`) | lighthouse |
| D3 | P2(a11y) | `.brand` 링크 aria-label에 가시 텍스트("GapProof")가 안 맞물림(label-content-name-mismatch) + 높이 35px | lighthouse, a11y touchAudit |
| D4 | P3 | 푸터 내비 링크 일부 가로폭 <44px(높이는 44) — 좁은 텍스트 링크 | a11y touchAudit |

## Phase B로 이연 (이번 Phase A에서 확정하지 않음)

최종 로고 품질 / favicon·apple-touch-icon·512 아이콘·OG 이미지 최종 검증(#24) / 카카오톡 실제 미리보기·Kakao Developers 앱 아이콘 / Naver 로그인 로고 / 실제 Solar 연결 표시 / 프로덕션 HTTPS 쿠키(Secure) / 프로덕션 엣지 rate limit / 실기기 iPhone Safari·Android Chrome 최종 판정 / 실사용 3분 리허설(발화 포함)
