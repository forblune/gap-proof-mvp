# Issue #24 — 브랜드 시안 3종 제작 (콘셉트 단계 — 최종 자산 아님)

- Issue: https://github.com/forblune/gap-proof-mvp/issues/24
- 브랜치: `design/24-brand-concepts` (기준 커밋 `950a8dd` = main)
- 작업일: 2026-07-25
- 범위: **승인된 방향 A(증거 연결형)의 비교용 시안 3종 제작만.** 기존 favicon/OG/플랫폼 아이콘 무교체, 임시 문구 유지, 배포·시크릿·#12 Phase B·#11·#13 미착수.

## 제작물

구조적으로 구분되는 3종(색 변형 아님):

| ID | 구조 | 비고 |
|---|---|---|
| A1 Broken G Bridge | G 개구부(간극)를 노란 세로 브리지가 잇는 원형 레터마크 | 파비콘 친화, 현 `.brand-mark`와 연속성 최고 |
| A2 Evidence Nodes | 끊어진 두 호 조각 + 간극 위 노란 증거 노드 2개 | 의미 서술이 가장 직접적, 소형·단색에서 약함 |
| A3 Negative Gap | 라운드 타일 + 대각 음각 채널 + 노란 브리지 | 실루엣 최강, 단색에서 'H' 오독 위험 |

각 시안: SVG 원본 6종(심볼/온다크/단색 흑·백/락업/락업 온다크) + 실측 렌더 `sheet.png`(16/32/35/64/128px × 밝은/어두운/단색 + 락업) + `appicon-512.png` + `og-mock.png`(1200×630). 통합 비교는 `comparison-board/board.png`.

## 제작 방법·제약 준수

- 색: 기존 디자인 토큰만(`--ink`, `--yellow`, `--paper`, `--ivory`) — 새 팔레트·그라데이션 없음, 단색에서 의미 유지 검증
- 워드마크: 프로젝트 시스템 폰트 스택 기반(새 유료 폰트 없음)
- 금지 모티프(체크 단독·문서·AI 별빛/뇌/로봇·그래프/계단/퍼즐) 미사용 — 평가표 #11·#12 실측 확인
- 렌더: 스크래치패드 생성 스크립트(gen-concepts.cjs, Playwright Chromium dSF2) — 리포에는 산출물만 커밋
- 평가: 지정 13항목 × 3사 PASS/CAUTION/FAIL — `docs/evidence/issue-24/concepts/evaluation.md`

## 평가 요약 (상세는 evaluation.md)

- A1: PASS 12 / CAUTION 1(#13 G 레터마크 선례 — 확정 전 유사 마크 검색 권장)
- A2: PASS 8 / CAUTION 5(16px 노드 소실, 단색 의미 약화, 카카오·네이버 소형/단색 제출 취약)
- A3: PASS 9 / CAUTION 4(단색·소형 'H' 오독, 현 원형 마크와 스타일 상이, 번개/H 모노그램 선례)
- **Claude 1순위 추천: A1** — 소형·단색 생존성과 이름 연결성을 동시에 만족하는 유일안 + UI 교체 비용 최소

## 상태·다음 단계

- Draft PR(제목에 "Concept review", `Closes #24` 미사용 — 콘셉트 승인용이며 production asset replacement 아님)
- 사용자가 A1/A2/A3 중 택1 승인한 뒤에만: 최종 자산 제작(favicon.svg/og.png/icon-512/apple-touch-icon 교체, metadata 경로 확인, 임시 문구 제거) 진행
