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

## 2. 환경 변수·시크릿 (이름만 — 값 미열람·미출력)

| 이름 | 구분 | 누락 시 동작 | 참조 코드 |
|---|---|---|---|
| `UPSTAGE_API_KEY` | **필수(실연결)** — 없어도 서비스는 뜨지만 전 분석이 샘플로 동작 | 규칙 기반 **샘플 폴백** + 명시 고지("Solar API 키가 없어…") — 오류 아님 | `app/api/analyze/route.ts` |
| `GATE_ACCESS_CODE` | **필수** | **fail-closed 503** `gate_not_configured` (데모 입장 불가) | `app/lib/gate-session.ts`, `app/api/gate/route.ts:54` |
| `GATE_SESSION_SECRET` | **필수** | **fail-closed** — 세션 발급·검증 전부 거부(401) | `app/lib/gate-session.ts` |
| `SOLAR_MODEL` | 선택 | 기본값 `solar-pro3`(allowlist) 사용 | `app/lib/models.ts` |
| `KAKAO_JS_KEY` | 선택 | 카카오 공유 버튼 미표시(다른 공유는 동작) | `app/api/share-config/route.ts` |
| `RATE_LIMIT_TEST_MODE` | **테스트 전용 — production 등록 금지** | Workers 런타임에서는 무시(인메모리 카운터는 Node 테스트 하니스 전용) | `app/lib/rate-limit.ts` |

- 로컬은 `.dev.vars`(무추적) / production은 `wrangler secret put` — 역할 분리 문서화됨(`.dev.vars.example` 헤더). `.dev.vars`는 열람·출력·커밋 금지 유지.
- 읽기 경로: `app/lib/server-env.ts` — `cloudflare:workers` env 우선, `process.env`는 Node 테스트 폴백 → production은 secret만 있으면 됨.

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
