# Issue #7 — Solar API 남용 방지와 입력 개인정보 보호

- Issue: https://github.com/forblune/gap-proof-mvp/issues/7
- 브랜치: `security/7-solar-abuse-pii` (기준 커밋 `43a8e61` = main)
- 작업일: 2026-07-25

## 조사·결정 (rate limit 방식)

| 후보 | 판정 |
|---|---|
| **Workers Rate Limiting API 바인딩** | **채택(1차)** — wrangler 4.92 스키마가 `ratelimits`(name/namespace_id/simple{limit, period∈10·60}) 지원, miniflare 소스에 로컬 에뮬레이션 확인, dist 산출물에 상속됨. 코드 변경 없이 엣지 실행 환경에서 유효 |
| Cloudflare 대시보드 Rate Limiting 규칙 | 보류 — 저장소 밖 설정이라 재현·검증 불가, 배포 계정 작업 필요. 운영 보강안으로 worklog에만 기록 |
| KV | 기각 — 결과적 일관성이라 정확한 카운팅 부적합 |
| Durable Objects | 기각 — 정확하지만 이 규모(데모 한도)에 과설계, vinext 경로에 신규 클래스 도입 위험 |
| **인스턴스 로컬 Map** | **보조 수단으로만** — Workers 인스턴스별 격리라 운영급 한도가 아님(코드 주석 명시). 바인딩이 없는 런타임(Node 테스트)과 바인딩 오류 시 fail-open 방지용 |

- 한도: analyze·gate 각각 **10회/60초**, 키는 `CF-Connecting-IP`(엣지가 설정하는 신뢰 헤더) 우선 → 게이트 세션 토큰 꼬리 → 공용. 게이트 POST에도 적용해 **접근 코드 무차별 대입 방지**.
- 429 응답 메시지는 #5의 오류 표시 경로로 클라이언트에 그대로 노출(클라이언트 코드 변경 0).

## PII 마스킹 설계

- 위치: 길이 검증 직후, **폴백 생성·Solar 전송 이전**. 마스킹된 텍스트가 이후 분석·인용 검증(`experience.includes(quote)`)의 기준이 되므로 검증과 충돌하지 않음(테스트로 확인).
- 패턴(오탐 최소화 보수적): 이메일 → `[이메일]`, 주민등록번호(6-7 형식) → `[주민등록번호]`, 휴대전화(01x) → `[전화번호]`.
- 고지: 서버가 `notice`에 "…(으)로 보이는 정보는 가리고 분석했어요."를 덧붙이고 `masked` 배열 반환 — STEP 2 explain-strip에 자동 표시(클라이언트 변경 0).

## 보안 헤더

- `worker/index.ts` 단일 출구에서 전 응답에 부착: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy(camera/mic/geo 차단)`, `CSP: frame-ancestors 'none'`.
- **전면 CSP(script-src 등) 보류 근거**: vinext의 인라인 하이드레이션/RSC 스크립트와 충돌 위험 — nonce 파이프라인 없이 도입하면 화면이 깨질 수 있어 frame-ancestors(클릭재킹 방지)만 적용. 후속 검토 항목으로 기록.

## 나머지 이슈 항목 처리

- `.gitignore`의 `.dev.vars` 제외: 이미 적용됨(#3에서 사용자 변경 보존, `git check-ignore` PASS) — 본 이슈에서 확인만.
- 프로덕션 env 주입 검증: #6에서 `cloudflare:workers` env 전환 + 실제 workerd 성공 경로 실증으로 해소. 본 이슈는 같은 유틸(`server-env.ts`)에 바인딩 접근(`readServerBinding`)을 추가해 재사용.

## 변경 파일

- 신규: `app/lib/pii.ts`, `app/lib/rate-limit.ts`, `docs/evidence/issue-7/`
- 수정: `app/api/analyze/route.ts`(429·마스킹·notice), `app/api/gate/route.ts`(게이트 한도), `app/lib/server-env.ts`(readServerBinding), `worker/index.ts`(보안 헤더), `wrangler.jsonc`(ratelimits 바인딩), `tests/rendered-html.test.mjs`
- 클라이언트(`app/page.tsx`) 변경 0 — UI 회귀 위험 최소화

## 검증 결과

- `npm test` **10/10 PASS** — 신규: 보안 헤더 전 응답 부착 / PII 마스킹(원문 PII 응답 부재·고지·인용 무결성·masked 배열) / rate limit(같은 키 10회 후 11번째 429 + 게이트 오답 10회 후 429). 기존 테스트는 요청별 테스트 IP로 버킷 격리
- 테스트 하네스 수정: worker 모듈을 요청마다 재import하던 것을 1회 로드로 변경(실제 Workers isolate 동작과 일치 — 모듈 상태 검증 가능)
- **실제 workerd dev 서버**: 헤더 5종 부착 확인, 게이트 오답 연속 시 **정확히 10회 후 429**(`security-headers-and-ratelimit.txt` — 바인딩/보조 경로 구분의 한계도 정직하게 기록), dist 산출물에 ratelimits 상속 확인
- 하네스 마스킹 실측(`pii-masking-demo.txt`): 원문 PII 미포함·고지 문구·claims 정상
- 5뷰포트 회귀 스모크(헤더 적용 상태): overflow 0·console error 0
- lint 통과 · diff-check 통과 · tsc 레거시 2건만(worker/index.ts — 본 이슈 수정에도 기존 오류 무변화) · **실 유료 Solar 호출 0건** · `UPSTAGE_API_KEY` 값 미열람·미출력

## 남은 제한사항 / 후속 후보

- 배포 후 프로덕션에서 ratelimit 바인딩 실동작 확인은 QA #12·배포 시점으로 이연(대시보드 Rate Limiting 규칙은 운영 보강안)
- 전면 CSP는 nonce 파이프라인 검토 후 별도(후속 후보)
- PII 패턴은 보수적 최소 집합(이름·주소 등 자유 텍스트 PII는 범위 외 — 입력 안내문이 계속 1차 방어)

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입 — Closes #7)
