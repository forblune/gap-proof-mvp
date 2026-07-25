# Phase B-0 — 배포 실행 계획 초안 (명령 미실행 · 값 미포함)

⛔ **DEPLOYMENT APPROVAL REQUIRED** — 아래 명령은 사용자의 명시적 배포 승인 후에만 실행한다.

## 0. 전제

| 항목 | 값 |
|---|---|
| 실행 디렉터리 | 저장소 루트 `/Users/gh/gap-proof-mvp` |
| 로그인 | `npx wrangler login` 완료 상태(브라우저 OAuth — **사용자 직접**). 확인: `npx wrangler whoami` |
| 대상 계정 | forblune.com 존재하는 Cloudflare 계정 |
| 대상 Worker | `gapproof-mvp` (Workers — Pages 아님, 환경 분리 없음 = 단일 production) |
| 커스텀 도메인 | `gapproof.forblune.com` — 기존 라이브가 같은 워커면 연결 유지, 아니면 대시보드 Custom Domain에서 연결(배포가이드 §5) |

## 1. 배포 전 (로컬)

```
git checkout main && git pull --ff-only        # 3454e83 이후 최신
npm test                                       # 15/15 (build 포함)
npm run lint                                   # 레거시 4건 외 신규 없음 확인
```

라이브 기준 확정(**사용자 — 대시보드**): Workers & Pages → gapproof-mvp → Deployments에서 **현 활성 버전 ID·시각 기록** → `docs/evidence/live-baseline.md` [확인 필요] 채움 = 롤백 목표.

## 2. 프로덕션 시크릿 등록 — **필수 3종만** (순서대로 · 값은 프롬프트에 직접 입력 — 채팅·파일·히스토리 금지)

```
npx wrangler secret put GATE_ACCESS_CODE       # 민감 secret — 누락 시 데모 입장 503
npx wrangler secret put GATE_SESSION_SECRET    # 민감 secret — 누락 시 세션 전부 거부
npx wrangler secret put UPSTAGE_API_KEY        # 민감 secret — 누락 시 샘플 폴백(명시 고지)
```

**이번 배포에서 등록하지 않는 변수** (분류 근거: `ops-config.md` §2):
- `SOLAR_MODEL` — 코드 기본값 `solar-pro3` 존재, 등록 불필요. 등록하게 되면 secret이 아닌 `wrangler.jsonc` `vars`로(비민감 설정)
- `KAKAO_JS_KEY` — 카카오 **JavaScript SDK 플랫폼 키**(server secret 아님). 이번 제출에서는 미등록 → 카카오 공유 버튼 미표시(링크 복사·시스템 공유는 동작). 후속 등록 시 버튼 활성화
- `ONTONGYOUTH_API_KEY` — 코드 참조 0건. 향후 기능용 로컬 보관 — **운영 등록 금지**
- `RATE_LIMIT_TEST_MODE` — 테스트 전용 — **등록 금지**
- #11(소셜 로그인)·#13(Supabase) 관련 변수 — 미구현, 해당 없음

등록 확인: `npx wrangler secret list` (이름만 출력됨) — 위 3종만 존재해야 함.

## 3. 배포

```
npm run build                                  # dist/ 최신화 (test가 이미 빌드했어도 명시 실행)
npx vinext deploy                              # = Workers 배포 (dist/server/wrangler.json 사용)
```

- 바인딩 확인: 배포 출력에 ASSETS·IMAGES·ratelimits(ANALYZE/GATE_RATE_LIMITER) 표시 확인. 이후 `npx wrangler deployments list`로 새 버전 ID 기록
- 결과 URL: `https://gapproof-mvp.<서브도메인>.workers.dev` (출력값) + `https://gapproof.forblune.com`
- **중요 — workers.dev는 선검증이 아님**: 단일 Worker `gapproof-mvp`에 Custom Domain이 붙는 구조라 `npx vinext deploy` 실행 순간 **workers.dev와 gapproof.forblune.com에 동일한 새 배포가 동시에 적용**된다. workers.dev 확인은 "배포 전 선검증"이 아니라 **배포 직후 smoke test**다. 별도 staging/canary는 **존재하지 않는다** — 운영 교체 전 검증이 필요해지면 별도 Worker 이름(예: gapproof-mvp-staging) 또는 wrangler env 구성이 필요하지만, 이번 제출에서는 만들지 않고 **즉시 롤백 절차(§5)** 로 위험을 관리한다
- 예상 다운타임: **0** (Workers 원자적 버전 전환) — 단, 구버전(유실 소스 라이브)이 신버전으로 즉시 교체됨

## 4. 배포 직후 로그·검증

```
npx wrangler tail gapproof-mvp --format pretty  # 실시간 로그(민감 정보 미출력 확인 겸용)
```
이후 `phase-b-matrix.md` A→E 순서로 실검증 (Solar 실호출은 승인된 1회만).

## 5. 롤백 (정확한 절차)

1. 대시보드: Workers & Pages → `gapproof-mvp` → Deployments/Versions → **1에서 기록한 구버전 ID** 선택 → Rollback
   (CLI 대안: `npx wrangler rollback [--message "..."]` — 직전 버전으로 복귀)
2. 롤백 후 `GET /` 200 + 게이트 표시 재확인
3. 시크릿 오류가 원인이면 코드 롤백 불필요 — `wrangler secret put <이름>`으로 값만 교체
4. 원인은 이슈로 기록, 로컬 재현 후 재배포

## 6. 변경되는 외부 서비스 범위

- Cloudflare Workers `gapproof-mvp` 버전 교체 + 시크릿 5종(2필수+1실연결+2선택) 등록 — **그 외 없음**
- DNS·도메인: 기존 연결 유지 시 무변경 / 미연결 시 대시보드 Custom Domain 1건 추가
- Kakao/Naver/Google 콘솔: **이번 배포 범위 아님**(external-followups.md — 제출 차단 아님)

## 7. 실제 Solar 호출 계획 — 최대 1회

- 예상 횟수: **정확히 1회**(Phase B-1, 사용자 승인 후) — 실연결 배지("Solar 실연결 · <모델>")와 인용 정합 확인용
- **429 검증은 무과금 경로로 수행** (코드 실행 순서로 증명 — `app/api/analyze/route.ts:171-218`): 게이트(401) → **rate limiter 소모(429/503)** → JSON 파싱(400) → 모델 allowlist(400) → **길이 검증(400/413)** → PII 마스킹 → Solar 호출. 즉:
  1. **analyze 무과금 경로**: 인증 세션 + 20자 미만 본문 11회 → 1~10회는 400 `input_too_short`(한도는 소모, Solar 미도달), 11회째 **429 + retry-after 60** — 유료 호출 0회
  2. **gate 무과금 경로**: 오답 코드 11회 → 429 (`app/api/gate/route.ts` — rate limit이 코드 비교보다 먼저) — Solar 무관
- production에서 정상 분석 요청 11회 반복은 **금지**(유료 호출 최대 10회 발생) — 운영 429 부하 테스트가 더 필요하면 제출 후 별도 staging에서
- `RATE_LIMIT_TEST_MODE`는 production 미등록. 이후 데모 시연은 회당 1회 수준. 남용 방어: 게이트 + 10회/60초 엣지 rate limit + 3,000자 상한

## 8. 위험 요소 · 사용자 직접 항목

| 위험 | 대응 |
|---|---|
| 라이브(유실 소스 구버전)가 즉시 교체됨 | 배포 전 활성 버전 ID 기록(롤백 목표) — **사용자** |
| 시크릿 미등록/오타 → 게이트 503 | 등록 직후 matrix A·C 즉시 확인, secret list로 이름 검증 |
| 접근 코드 변경 시 기존 공유 링크 이용자 혼선 | 접근 코드 값 결정은 **사용자**(기존 1234 유지 여부) |
| 카카오 미리보기 구 OG 캐시 | 카카오 공유 디버거로 캐시 갱신(matrix B) |
| wrangler 로그인·계정 선택 | **사용자 직접**(`wrangler login`/`whoami`) |

사용자 직접 해야 하는 항목 요약: ① wrangler login ② 활성 버전 ID 기록 ③ 시크릿 5종 값 입력 ④ (미연결 시) Custom Domain 연결 ⑤ 실기기 검증 참여(iPhone/Android) ⑥ 카카오톡 실공유 확인.
