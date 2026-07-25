# Phase B-0 — 운영 환경 구성표 (읽기 전용 점검, 2026-07-25)

기준 커밋: `3454e83` (main) · 브랜치 `qa/12-phase-b-readiness` · **실행·배포·시크릿 등록 없음**

## 1. 배포 구조

| 항목 | 값 | 근거 |
|---|---|---|
| 플랫폼 | Cloudflare **Workers** (Pages 아님) | `wrangler.jsonc` + `vinext deploy`("Deploy to Cloudflare Workers") |
| Worker 이름 | `gapproof-mvp` | `wrangler.jsonc` `name` |
| Worker 진입점 | `worker/index.ts` → 빌드 산출 `dist/server/index.js` | `wrangler.jsonc` `main`, `dist/server/wrangler.json` |
| 정적 자산 | `dist/client` (ASSETS 바인딩, not_found_handling: none) | `wrangler.jsonc` `assets` |
| compatibility_date | `2026-05-22` (+ 빌드가 `nodejs_compat` 플래그 부여) | #16 정정, `dist/server/wrangler.json` 상속 확인 |
| 프레임워크 | vinext 0.0.50 (Next App Router → Workers) — 빌드: `npm run build` | package.json |
| 커스텀 도메인 | `gapproof.forblune.com` — **대시보드 Custom Domain 방식**(wrangler.jsonc에 routes 없음) | 배포가이드 §5, 설정 파일 확인 |
| 기본 URL | `https://gapproof-mvp.<계정 서브도메인>.workers.dev` (배포 시 출력) | 배포가이드 §3 |

주의: 현재 라이브(gapproof.forblune.com)는 **소스 유실 전의 구버전 워커 배포**가 서비스 중. 같은 이름(`gapproof-mvp`)으로 배포하면 즉시 교체된다 → 롤백 목표(현 활성 버전 ID)를 배포 전에 대시보드에서 기록해야 함(`docs/evidence/live-baseline.md`의 [확인 필요 — 사용자] 항목).

## 2. 환경 변수 분류표 (이름만 — 값 미열람·미출력, 2026-07-25 보완 재분류)

| 변수명 | 코드 참조 위치 | 민감 여부 | 현재 배포 필수 | 누락 시 동작 | 등록 방식 | 이번 배포 |
|---|---|---|---|---|---|---|
| `GATE_ACCESS_CODE` | `app/lib/gate-session.ts:34`, `app/api/gate/route.ts` | **민감 secret** | **필수** | **fail-closed 503** `gate_not_configured`(입장 불가) | `wrangler secret put` | **등록** |
| `GATE_SESSION_SECRET` | `app/lib/gate-session.ts:51,65` | **민감 secret**(HMAC 서명 키) | **필수** | **fail-closed** — 세션 발급·검증 전부 거부(401) | `wrangler secret put` | **등록** |
| `UPSTAGE_API_KEY` | `app/api/analyze/route.ts:225` | **민감 secret**(유료 API 키) | **필수(실연결)** — 없어도 기동은 되나 전 분석이 샘플 | 명시 고지 **샘플 폴백**(오류 아님) | `wrangler secret put` | **등록** |
| `SOLAR_MODEL` | `app/api/analyze/route.ts:227-229` | 비민감(모델 ID 문자열) | **불필요** — 코드 기본값 `DEFAULT_MODEL_ID="solar-pro3"` 존재(`app/lib/models.ts:14`), 우선순위는 사용자 선택 > env > 기본값이라 env 없이 완전 동작 | 기본 모델 사용(정상) | 필요 시 `wrangler.jsonc` **`vars`**(secret 아님) | **제외** |
| `KAKAO_JS_KEY` | `app/api/share-config/route.ts` | 비민감 — **카카오 JavaScript SDK 플랫폼 키**(server secret 아님; `/api/share-config`가 클라이언트에 그대로 전달하는 공개 성격 키) | 불필요 — 공유 버튼(#10) 조건부 표시 용도(소셜 로그인 #11과 무관) | 카카오 공유 버튼 미표시(링크 복사·시스템 공유는 동작) | 등록 시 env/vars 계열 | **제외**(이번 제출에서 버튼 미표시. 후속 등록 시 버튼 활성화) |
| `ONTONGYOUTH_API_KEY` | **코드 참조 0건**(app/·worker/·tests/·설정 전수 grep) — Worker Env 타입 선언에도 없음(`worker/index.ts` Env는 ASSETS/DB/IMAGES뿐), API 호출 구현 없음, 누락 시 동작 자체가 없음(어디서도 읽지 않음) | (값 미확인 — 이름만 취급) | **아님** | 영향 없음 | — | **제외** — **향후 기능용 로컬 보관 · 현재 배포 등록 대상 아님 · 운영 secret 등록 금지** |
| `RATE_LIMIT_TEST_MODE` | `app/lib/rate-limit.ts` | 비민감 | **금지** | Workers 런타임에서 무시(인메모리 카운터는 Node 테스트 전용) | — | **제외(등록 금지)** |

**이번 배포 승인표 요약**: 필수 secret **3종**(GATE_ACCESS_CODE·GATE_SESSION_SECRET·UPSTAGE_API_KEY) / 일반 설정 등록 **0종**(SOLAR_MODEL은 코드 기본값으로 충분) / 제외 **4종+α**(KAKAO_JS_KEY·ONTONGYOUTH_API_KEY·RATE_LIMIT_TEST_MODE·#11/#13 관련 변수 일체 — 소셜 로그인·Supabase 미구현이므로 해당 변수 없음).

- 로컬은 `.dev.vars`(**gitignore 확인: `git check-ignore` 매치 + `git ls-files` 0건 = 무추적**, 내용 미열람) / production 민감값은 `wrangler secret put` — 역할 분리(`.dev.vars.example` 헤더).
- 읽기 경로: `app/lib/server-env.ts` — `cloudflare:workers` env 우선, `process.env`는 Node 테스트 폴백 → production은 secret/vars만 있으면 됨.

## 3. 바인딩

| 바인딩 | 종류 | 상태 |
|---|---|---|
| `ASSETS` | 정적 자산 | wrangler.jsonc 정의 — 배포 시 자동 |
| `IMAGES` | Images API | 스캐폴드 기본 — 코드에서 이미지 최적화 경로에 사용(vinext) |
| `ANALYZE_RATE_LIMITER` | Workers Rate Limiting (10회/60초) | wrangler.jsonc `ratelimits` — 산출물 상속 확인, **별도 대시보드 등록 불필요** |
| `GATE_RATE_LIMITER` | Workers Rate Limiting (10회/60초) | 동일 |
| ~~`DB` (D1)~~ | **레거시 선언 — 미사용** | `worker/index.ts` Env 인터페이스에만 존재, wrangler.jsonc에 d1 없음·app 코드 참조 0건. tsc 레거시 오류 2건의 원인. 배포 차단 아님(타입 선언일 뿐) — 정리는 후속 |

기타 레거시: `drizzle.config.ts`·`db:generate` 스크립트 — app 코드 참조 0건(스캐폴드 잔재, 배포 무관).

## 4. 보안·품질 경로 현황 (코드 실측)

- **샘플/실응답 구분**: 서버가 `source: "sample" | "solar"` 반환 → 헤더 배지("Solar 실연결 · <모델>" / "Solar 샘플 데모", `app/page.tsx:501-503`) + 결과 카드 푸터("Solar 실연결"/"샘플 데이터" · 판정 아님 고지, `:873`) + notice 문구 3종(키 없음/연결 불안정/인용 불일치 — `analyze/route.ts:232-285`)
- **rate limit 저장**: Workers Rate Limiting API 바인딩(엣지 차원) — 인메모리 아님. 바인딩 실패 시 **fail-closed 503 `rate_limit_unavailable`**(analyze `:181-184`, gate `:25-26`) — 조용한 대체 없음
- **Retry-After**: 429 응답에 `retry-after: 60` + no-store (analyze `:191`, gate `:32`)
- **PII 마스킹**: `app/lib/pii.ts` — Solar 전송 **전** 이메일/주민번호/전화 → `[이메일]` 등 치환, 마스킹본이 인용 검증 기준
- **쿠키**: HMAC-SHA256 서명 HttpOnly, `SameSite=Lax`, **Secure는 HTTPS에서 자동 포함**(localhost/127.0.0.1 HTTP에서만 생략 — `gate-session.ts:47`) → production(HTTPS)에서는 항상 Secure
- **보안 헤더**: 단일 출구 부착(nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, CSP frame-ancestors 'none' — `worker/index.ts`)
- **모델 allowlist**: `solar-pro3`(기본)/`solar-pro2`/`solar-mini` 외 400 `model_not_allowed`
