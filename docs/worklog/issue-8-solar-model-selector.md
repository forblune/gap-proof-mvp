# Issue #8 — Solar 모델 선택 UI와 서버 allowlist 연결

- Issue: https://github.com/forblune/gap-proof-mvp/issues/8
- 브랜치: `feat/8-solar-model-selector` (기준 커밋 `27ab769` = main)
- 작업일: 2026-07-25

## 설계 결정

1. **단일 출처 allowlist**: `app/lib/models.ts`에 모델 목록(id·이해 가능한 라벨·설명)을 정의하고 서버 검증(`isAllowedModel`)과 클라이언트 UI가 같은 모듈을 사용. 공개 UI 데이터만 포함(API 키·내부 설정 없음).
2. **서버 강제**: 클라이언트가 어떤 문자열을 보내든 allowlist 밖이면 **400 `model_not_allowed`**(안전 메시지, 요청 값 미반사). 모델 결정 우선순위: 사용자가 선택한 허용 모델 > 운영자 `SOLAR_MODEL` env(허용 목록 내일 때만) > 기본 `solar-pro3`. **기본 모델 항상 존재.**
3. **검사 순서 보존(#6·#7 유지)**: 인증 → rate limit → 본문 파싱 → **모델 allowlist** → 길이 검증 → PII 마스킹 → 분석. 429/503/400 전부 Solar 호출 이전.
4. **UI**: 헤더 상단 `<select>`(aria-label "Solar 모델 선택", title=설명, 로딩 중 disabled). 옵션 라벨 "Pro 3 (기본)"·"Pro 2"·"Mini". 게이트 인증 후에만 노출(top-actions). 새 샘플·기록 삭제 시 기본 모델로 초기화. 실사용 모델 표시는 기존 응답 `model` 경로 재사용(폴백 시 "샘플" 유지).
5. **모바일 과밀 해소**: ≤720px에서 top-actions gap·배지 폭 축소, **≤480px에서는 배지 텍스트를 점(dot)으로 축약** — 전체 상태 텍스트는 배지 `aria-label`·푸터·STEP2 스트립이 계속 제공(색상 단독 전달 아님). 360px 스윕 overflow 0 확인.

## 변경 파일

- 신규: `app/lib/models.ts`, `docs/evidence/issue-8/`
- 수정: `app/api/analyze/route.ts`(allowlist 검증·모델 결정), `app/page.tsx`(셀렉터·요청 본문·초기화), `app/globals.css`(.model-select·모바일 배지 축약), `README.md`(모델 선택·allowlist 안내), `tests/rendered-html.test.mjs`

## 검증 결과

- `npm test` **13/13 PASS** — 신규: 임의 모델 400+미반사 / 허용 모델 200(sample — **실 유료 Solar 호출 0건**) / 미지정 기본 경로 / 단일 출처 소스 계약
- E2E(하네스): 셀렉터 기본값·옵션 3종 확인, **Mini 선택 → 실제 요청 본문 `model:"solar-mini"`**(인터셉트 캡처), 로딩 중 disabled, 페이지 오류 0 (`model-allowlist-verification.txt`)
- 5뷰포트 스윕(셀렉터 포함 헤더): overflow 0·console error 0, 360px 헤더 공존 캡처(`header-360-with-selector.png`)
- lint 통과 · diff-check 통과 · tsc 레거시 2건만(worker/index.ts, 무변화) · `npm run build` 정상(테스트 선행)
- #7 경로 회귀 없음: rate limit·PII·게이트 테스트 전부 유지 통과

## 남은 제한사항

- 실키 연결 시 모델별 실제 응답 표시(배지 "Solar 실연결 · <model>")는 프로덕션 키 등록 후 QA #12에서 확인
- 모델 목록은 대회 시점 공개 모델 기준 — Upstage 라인업 변경 시 `models.ts` 한 곳만 갱신

## 관련 커밋·PR

- 커밋: `1676c0a` feat: Solar model selector wired to server allowlist (#8)
- PR: https://github.com/forblune/gap-proof-mvp/pull/21 (Closes #8)
