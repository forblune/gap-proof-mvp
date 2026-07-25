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

## PR #30 보완 — 배포 계획 문서 수정 (2026-07-25, 사용자 검토 반영)

1. **secret 재분류**: 등록 대상을 "5종 secret" → **민감 secret 3종만**(GATE_ACCESS_CODE·GATE_SESSION_SECRET·UPSTAGE_API_KEY)으로 수정. `SOLAR_MODEL`은 코드 기본값(`DEFAULT_MODEL_ID="solar-pro3"`, 우선순위 사용자 선택>env>기본값)이 있어 **등록 불필요·비민감 설정**(등록 시 vars). `KAKAO_JS_KEY`는 **카카오 JavaScript SDK 플랫폼 키**(클라이언트 전달용 공개 성격 — server secret 아님)로 정정하고, #11 미구현·버튼 미표시 방침에 따라 **이번 배포 제외**. 7열 분류표로 재작성(ops-config.md §2)
2. **ONTONGYOUTH_API_KEY**: 코드 참조 **0건** 확인(app/·worker/·tests/·설정 전수 grep, Worker Env 타입 선언에도 없음, 호출 구현 없음) → 판정 A: **향후 기능용 로컬 보관 · 현재 배포 등록 대상 아님 · 운영 secret 등록 금지**. `.dev.vars`는 내용 미열람, `git check-ignore` 매치 + `git ls-files` 0건으로 무추적만 확인
3. **무과금 429 검증으로 수정**: analyze 실행 순서 실측(게이트 401 → **rate limiter** → JSON 400 → 모델 400 → **길이 400/413** → 마스킹 → Solar) — 길이 미달 요청은 한도를 소모하되 Solar에 도달하지 않음. 매트릭스 D를 "20자 미만 본문 11회 → 400×10 + 429" + "게이트 오답 11회 → 429" 경로로 교체, **production 정상 분석 11회 반복 금지** 명시. 실제 Solar 호출은 C절 승인된 **최대 1회** 유지, 운영 부하 테스트는 제출 후 별도 staging으로 이연
4. **workers.dev 표현 정정**: 단일 Worker에 Custom Domain이 붙는 구조라 배포 순간 두 URL에 **동시 적용** → workers.dev 확인은 "선검증"이 아닌 **배포 직후 smoke test**로 수정. staging/canary **부재** 명시, 이번 제출에서는 만들지 않고 즉시 롤백 절차로 위험 관리
5. **/privacy·/terms 실측**: 빌드 산출물 하니스에서 `/about` 200·`/guide` 200·`/privacy` **404**·`/terms` **404** 확인(기존 기록이 정확 — 근거를 실측으로 보강). #11 제외 상태에서 제출 비차단 후속으로 분류
6. **배포 승인표 분리**: 필수 secret 3종 / 일반 설정 등록 0종 / 제외(KAKAO_JS_KEY·ONTONGYOUTH_API_KEY·RATE_LIMIT_TEST_MODE·#11/#13 변수) — 실행 명령(§2)도 동일 분류로 일치화

변경은 문서 4개(ops-config·deploy-plan·phase-b-matrix·본 워크로그)뿐 — 코드·배포·시크릿·외부 콘솔 무변경, 실 Solar 호출 0건.

## 상태

- PR: https://github.com/forblune/gap-proof-mvp/pull/30 — 제목에 "Phase B readiness", **Closes #12 미사용**(Phase B 실검증·실기기·배포가 남아 있으므로 이슈 유지)
- 다음 단계: 사용자 배포 승인 → deploy-plan.md 순서 실행(Phase B-1) → phase-b-matrix.md A~E 실검증 → 결과 기록 후 #12 종료 판단
