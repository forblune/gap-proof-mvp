# Issue #16 — Cloudflare compatibility_date와 로컬 workerd 호환성 정리

- Issue: https://github.com/forblune/gap-proof-mvp/issues/16
- 브랜치: `chore/16-cloudflare-compatibility` (기준 커밋 `b6833b5` = main)
- 작업일: 2026-07-24

## Before

- `npm run dev` 기동 불가: `This Worker requires compatibility date "2026-07-23", but the newest date supported by this server binary is "2026-05-22"` → `MiniflareCoreError [ERR_RUNTIME_FAILURE]` (`docs/evidence/issue-16/before-dev-error.log`)
- 그간 검증은 빌드 산출물을 Node로 감싼 하네스로 대체해 왔음(#4·#5)

## 조사·결정

`docs/evidence/issue-16/versions-and-decision.md` 참조 (버전 비교표 · 원인 = 스캐폴드 생성일이 그대로 기입 · 업그레이드 대안 기각 근거 = 최신 miniflare도 07-23 미지원 + vite-plugin의 자체 버전 고정 + vinext 메이저 점프 위험 · 채택 = 도구 지원 최대일 2026-05-22로 정정).

## 변경 파일

- `wrangler.jsonc` 1개 — `compatibility_date` 정정 + 근거 주석 (다른 설정·패키지·잠금파일 무변경)

## 검증 결과

- **실제 dev 서버**: `npm run dev` 정상 기동, `GET /` 200·타이틀 렌더, `/api/analyze` 200(sample)/400 계약 정상 (`after-dev-startup.log` — 실제 dev 서버 사용 증거)
- 5뷰포트 전체 여정 스모크(실 dev 서버 대상): overflow 0·console error 0·#4/#5 기능 유지 (`dev-server-smoke-metrics.json`)
- `npm test` 5/5 · `npm run lint` 통과 · `git diff --check` 통과 · tsc 기존 3건만(무변경) · `npm run build` 정상 + 산출물이 정정 날짜 상속 확인
- 실 유료 Solar 호출 0건(모든 API 응답 `source:"sample"`로 확인), `.dev.vars` 내용 미열람, 증거 파일 비밀값 패턴 스캔 0건

## 남은 제한사항 / 새 발견

- **#7 직결 관찰**: `.dev.vars` 로드에도 응답이 sample → workerd에서 `process.env` 시크릿 주입이 안 되는 정황. #7에서 `cloudflare:workers` env 접근 검증 필요 (여기서는 범위상 수정하지 않음)
- 현재 라이브 배포본의 compatibility_date는 확인 불가(소실 소스 세대) — deploy 금지 유지
- 도구 업그레이드(wrangler 4.114 / vite-plugin 1.47 / vinext 1.0.0-beta)는 대회 후 별도 검토 후보

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입 — Closes #16)
