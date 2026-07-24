# Issue #12 — QA Phase A (로컬 사전 검증)

- Issue: https://github.com/forblune/gap-proof-mvp/issues/12 — **Partial progress for #12 — Phase A** (완료 처리 아님)
- 브랜치: `qa/12-local-preflight` (기준 커밋 `966296b` = main)
- 작업일: 2026-07-25
- 관련: 브랜드 자산 이슈 #24 생성(로고 미제작·미확정 — 체크리스트·승인 절차만)

## 수행 범위 요약 (상세: `docs/evidence/issue-12/qa-matrix.md`)

1. **5뷰포트**(360/390/768/1024/1440): 가로 overflow 0·console error 0·핵심 규격 유지 (`viewport-matrix.json`)
2. **상태 경로 12종**: 비인증 게이트/오답/인증/정상 분석/입력 오류/429(Retry-After 60·alert 표시)/**binding 실패 503 화면 표시**/PII 마스킹/sample 명시/확인 0개 차단/삭제 취소·확인/데모 잠금 — 전부 PASS (`state-matrix.json`)
3. **접근성**: 키보드만으로 게이트→카드 완주(STEP4 포커스=H1), Enter/Space/Escape, focus-visible 캡처, aria alert/status, 미명명 요소 0, reduced-motion 적용 — PASS (`a11y-results.json`)
4. **인쇄**: 크롬 숨김·카드 2종·당일 날짜 PASS + **결함 후보 D1**(배경 미인쇄 시 목표직무명 비가시 — 감사 예측 실측 확인) (`print-*.pdf/png`)
5. **Lighthouse 로컬 기준선**: 홈 67/95/100/100 · about 90/95/100/100 — 프로덕션 점수 아님 명시, 감점 원인 기록 (`lighthouse-local-baseline.json`)
6. **3분 시연**: 시나리오 문서(`demo-script-3min.md`) + 자동 주행 5/5(회당 3.9~5.1초, 막힘 0) (`rehearsal-runs.json`) — 발화 포함 실측은 Phase B
7. **배포 전·롤백 체크리스트 초안**(`deploy-rollback-checklist.md`) — 실행 금지 상태 명시

## 결함 후보 (미수정 — 후속 이슈 대상)

- **D1(P1)**: 인쇄 배경 OFF 시 `.identity` 흰 글씨 비가시 → print 전용 색 처리 필요
- D2(P2): muted 텍스트 2곳 대비 4.42~4.48(기준 4.5 미세 미달)
- D3(P2): `.brand` 링크 accessible name 불일치 + 높이 35px
- D4(P3): 푸터 내비 일부 링크 가로폭 <44px

## Phase B 이연 (명시)

최종 로고·favicon·apple-touch-icon·512 아이콘·OG 최종 검증(#24 선행) / 카카오톡 실제 미리보기·Kakao 앱 아이콘 / Naver 로그인 로고 / 실제 Solar 연결 / 프로덕션 HTTPS 쿠키·엣지 rate limit / 실기기 Safari·Android 최종 판정 / 발화 포함 실사용 리허설

## 회귀 게이트

- `npm test` 15/15 · `npm run lint` 통과 · `git diff --check` 통과 · tsc 레거시 2건만 · 실 유료 Solar 호출 0건 · `.dev.vars` 미열람 · 코드 무수정(문서·증거만 추가)

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입 — "Partial progress for #12 — Phase A", Closes 미사용)
