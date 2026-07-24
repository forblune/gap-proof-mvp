# Issue #26 — 인쇄 결과 카드의 배경 미출력 시 텍스트 가독성 보장 (+D2 대비)

- Issue: https://github.com/forblune/gap-proof-mvp/issues/26
- 브랜치: `fix/26-print-contrast` (기준 커밋 `185d493` = main)
- 작업일: 2026-07-25

## 결함 재현 (Before — `docs/evidence/issue-26/before/`)

- 브라우저 "배경 그래픽 인쇄 안 함"(기본) 근사에서 개인 카드 `.identity`가 **투명 배경 + 흰 글씨**(`identityH2Color: rgb(255,255,255)`, `identityBg: rgba(0,0,0,0)`) → 목표 직무명 비가시 (`chromium-print-bg-off.png`)
- 배경 ON에서는 정상(네이비+흰 글씨). PDF 2페이지·카드/Brief 표시·크롬 요소 숨김·당일 날짜 정상
- D2 대비(도구: WCAG 2.x 상대 휘도 공식 자체 스크립트 + 렌더 색상 채취, `contrast-before.json`): `.info-cta small` **4.49**, `.site-footer p` **4.42** (기준 4.5)

## 원인

- 화면용 `.identity`(네이비 배경+흰 글씨)에 인쇄 전용 색 처리가 없어, 배경 미출력 시 흰 글씨만 남음. `print-color-adjust` 계열 선언도 없었음(감사 F절 예측 → QA Phase A 실측 확정)

## 수정 방식

- **인쇄 반전(print CSS만, 화면 마크업 무변경)**: `@media print`에서 `.identity`를 흰 배경+잉크 글씨+하단 2px 구분선으로 반전, `.brand-mark`는 흰 배경+잉크 G+테두리. **`print-color-adjust: exact`에 의존하지 않음** — 배경 출력 설정·흑백과 무관하게 가독. `.confirm-bar`도 인쇄 제외 목록에 추가(#5 이후 신설 요소 보강)
- **D2 최소 조정(해당 조합만)**: `.info-cta small` `--muted`→`#5e687d`, `.site-footer` `#777064`→`#6d675c`. 전역 `--muted`·브랜드 색은 무변경. `.footer-nav a`는 측정 결과 4.86으로 기준 충족 → 무변경(기록)

## Before / After

| 항목 | Before | After |
|---|---|---|
| 배경 OFF 인쇄의 목표직무명 | 흰 글씨(비가시) | **잉크색(가시)** — chromium·webkit 모두 `rgb(23,36,61)` |
| 배경 ON 인쇄 | 네이비+흰 글씨 | 흰 배경+잉크(일관 반전 — 톤 통일) |
| 흑백 근사 | 비가시 위험 | 전 텍스트 진한 색 — 구분 가능 (`chromium-print-grayscale.png`) |
| 카드·Brief 잘림/빈 페이지 | 없음/2p | 없음/2p (동일) |
| `.info-cta small` 대비 | 4.49 | **5.05** |
| `.site-footer p` 대비 | 4.42 | **5.06** |

## 브라우저별 인쇄 검증

- **Chromium**: print 에뮬레이션 배경 ON/OFF/흑백 캡처 + `page.pdf`(A4, printBackground:false) 2페이지 — 전부 가독
- **WebKit(Safari 계열 렌더)**: print 에뮬레이션 배경 OFF에서 identity 잉크색·카드 표시·크롬 숨김 확인 (`after/webkit-print-bg-off.png`)
- **한계(정직 기록)**: WebKit 자동화로는 실제 macOS/Safari 시스템 인쇄 미리보기 대화상자 자체는 확인 불가 — 인쇄용 CSS 렌더까지 검증했으며, 실기기 Safari 인쇄 확인은 #12 Phase B 항목

## 화면 회귀·접근성

- 5뷰포트 스윕: overflow 0 · console error 0 (화면용 스타일은 D2 색 2곳 외 무변경)
- focus-visible 전역 규칙 무변경, 색상 단독 의미 전달 없음(기존 텍스트 병기 유지), hover/focus/disabled 상태 무관(정적 텍스트 색만 조정)
- `npm test` 15/15 · lint 통과 · diff-check 통과 · tsc 레거시 2건만 · 실 유료 Solar 호출 0건 · #24 자산 파일 무변경

## 남은 제한 / 후속

- 실기기 Safari·모바일 인쇄와 실제 프린터 출력 확인은 #12 Phase B
- 인쇄가 화면과 달리 흰 배경 카드로 통일됨(의도된 반전) — 브랜드 자산(#24) 확정 시 인쇄 헤더 브랜딩 재검토 여지

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입 — Closes #26)
