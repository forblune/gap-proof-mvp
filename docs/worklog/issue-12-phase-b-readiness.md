# Issue #12 — Phase B-0: 배포 전 준비 상태 점검 (읽기 전용·문서 작업)

- Issue: https://github.com/forblune/gap-proof-mvp/issues/12 (OPEN 유지 — Closes 미사용)
- 브랜치: `qa/12-phase-b-readiness` (기준 커밋 `3454e83` = main)
- 작업일: 2026-07-25
- 범위 준수: **deploy·secret 등록·바인딩 변경·도메인 변경·대시보드 변경·실 Solar 호출·외부 콘솔 변경·#11/#13 구현 전부 미실행.** 비밀값 미열람·미출력(변수 이름만 취급)

## 산출물 (docs/evidence/issue-12/phase-b-readiness/)

| 문서 | 내용 |
|---|---|
| `ops-config.md` | 운영 구성표 — Workers 배포 구조(`gapproof-mvp`, vinext deploy), 진입점, 변수 6종 표(필수/선택/fail-closed/테스트 전용), 바인딩 4종+레거시 DB 선언, 샘플·실연결 구분, rate limit 저장(엣지 바인딩), Retry-After, PII, 쿠키(Secure 자동) |
| `deploy-plan.md` | 배포 명령 초안(값 미포함) — 사전 점검→시크릿 5종 순서→`npm run build`+`npx vinext deploy`→tail 로그→**롤백 절차**(버전 ID 기반 대시보드/CLI)→위험·사용자 직접 항목. **DEPLOYMENT APPROVAL REQUIRED 게이트 명시** |
| `phase-b-matrix.md` | 실검증 매트릭스 A(기본 접근)→B(브랜드)→C(실분석·Solar 1회)→D(운영 오류·남용 방어)→E(실기기 8종) 실행 순서 |
| `external-followups.md` | 카카오/네이버/구글 후속 6항목 — #11 제외 상태이므로 전부 **제출 비차단 후속**으로 분류(카카오 공유는 콘솔 로고 무관) |

## 점검에서 확인된 사실(코드·설정 실측)

- 배포는 **Workers 단일 환경**(definedEnvironments 없음) — production 지정 플래그 불필요, 버전 전환 원자적(다운타임 0)
- `wrangler.jsonc`의 ratelimits가 빌드 산출물(`dist/server/wrangler.json`)에 상속됨 — 대시보드 수동 등록 불필요
- 필수 시크릿: `GATE_ACCESS_CODE`·`GATE_SESSION_SECRET`(누락 시 fail-closed 503/401) / 실연결: `UPSTAGE_API_KEY`(누락 시 명시 고지 샘플 폴백) / 선택: `SOLAR_MODEL`(기본 solar-pro3)·`KAKAO_JS_KEY`(누락 시 버튼 미표시)
- `RATE_LIMIT_TEST_MODE`는 Node 테스트 전용 — **production 등록 금지** 명시
- 레거시(배포 비차단, 후속 정리 후보): `worker/index.ts`의 `DB: D1Database` 선언(미사용, tsc 레거시 2건 원인), `drizzle.config.ts`·`db:generate` 스크립트(참조 0건)
- `/privacy`·`/terms` 라우트 **부재**(정보 페이지는 about/guide/how-it-works/technology 4종) — 매트릭스에 현황 기록, 카카오 이메일 권한(#11 계열) 진행 시 선행 필요
- 라이브 도메인은 유실 소스 구버전이 서비스 중 — 배포 시 즉시 교체되므로 **활성 버전 ID 기록(사용자)** 이 롤백 전제(`docs/evidence/live-baseline.md` [확인 필요] 항목 유지)

## 검증 (Phase B-0 자체 — 문서만 추가된 상태)

- `npm test` 15/15 · `npm run build` 성공(테스트가 빌드 포함)
- `npm run lint` 4건 — 전부 기존 레거시(info-shell `<a>` 2·guide 따옴표 2), 신규 0
- `npx tsc --noEmit` 2건 — 전부 기존 레거시(worker Fetcher/D1Database), 신규 0
- `git diff --check` 통과 · 실 Solar 호출 0건 · production 변경 0건

## 상태

- PR: (생성 후 기입) — 제목에 "Phase B readiness", **Closes #12 미사용**(Phase B 실검증·실기기·배포가 남아 있으므로 이슈 유지)
- 다음 단계: 사용자 배포 승인 → deploy-plan.md 순서 실행(Phase B-1) → phase-b-matrix.md A~E 실검증 → 결과 기록 후 #12 종료 판단
