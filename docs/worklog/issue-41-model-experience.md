# Issue #41 — Gate 5: 모델 선택 상세 경험

- Issue: #41 · 브랜치 `feat/41-model-experience`(base rc `5882575`) · 작업일 2026-07-25

## 구현

- **헤더 요약형**: "AI 분석 모델 / Solar Pro 3 · 기본" + [모델 변경] — native select를 주요 UI에서 제거
- **네이티브 `<dialog>`**: 데스크톱 중앙 다이얼로그 / 모바일 바텀시트(CSS 분기, 82dvh) — focus trap·Esc는 플랫폼 기본, **모바일 뒤로가기 = 닫기**(history state 연동), 열기 버튼으로 포커스 복귀
- **카드형 radio group**: 모델 3종 × {정식 이름·배지(기본·추천/안정형/빠른 초안)·[공식] 포지셔닝·[공식] 잘 맞는 입력·[자체] 속도/긴 글/근거 추출·주의} — **공식(Upstage 소개)과 자체 평가를 [공식]/[자체]로 구분**, 미검증 항목은 전부 "평가 중"(장점 창작 금지)
- **일치 보장**: 선택 UI ↔ `/api/analyze` 요청 body.model ↔ 결과 배지(기존 analysisModel 표시) — allowlist·기본값 로직 무변경(models.ts 단일 출처 유지)

## 검증

- e2e `tests/e2e/model-verify.cjs` **6/6**(390px): 기본 요약 표기, 바텀시트 열림, [공식]/[자체]/평가 중 구분, radio 3종, Esc 닫힘, Mini 적용→요약 갱신→**요청 body model=solar-mini 실측**(무과금 — 하네스 키 없음)
- `npm test` 28/28(모델 UI 계약 갱신: 다이얼로그 aria·모델 변경·평가 중) · lint 레거시 4 외 0 · tsc 레거시 2 외 0 · diff OK

## 알려진 한계

- [자체] 항목의 실측 채움(속도·근거 추출)은 운영 데이터 수집 후(제출 후 과제) — 그 전까지 "평가 중" 유지가 계약
