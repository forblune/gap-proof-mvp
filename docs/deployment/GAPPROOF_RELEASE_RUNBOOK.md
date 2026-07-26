# GapProof RC 릴리스 Runbook (실행 금지 — 사용자 승인 후 절차서)

플랫폼: Cloudflare Workers `gapproof-mvp` 단일 워커(토폴로지 문서 참조). **main 병합은 배포를 트리거하지 않는다** — 병합과 배포는 독립 단계다. 자동 배포·CI 부재.

## 경로 판정: A(Preview) vs B(직접 교체)

- Cloudflare Workers의 preview 채널(workers.dev·버전 미리보기)은 이 계정에서 **workers.dev 서브도메인 미등록**이라 URL이 없고, 등록은 대시보드 변경(승인 필요)이다.
- **판정: 경로 B(직접 교체 + 즉시 smoke + 롤백 대기)를 기본**으로 한다. 사용자가 원하면 A′(대시보드에서 workers.dev 등록 후 `wrangler versions upload`로 preview URL 검증)를 선택할 수 있다 — 등록 1회가 유일한 추가 비용.

## 경로 B — 직접 교체 절차 (권장·검증된 흐름)

### B-0. 사전 조건(승인 후, 배포 전)
```
git checkout main && git pull --ff-only          # PR #63 병합 후의 main
npm test                                          # 32/32 확인
npx wrangler whoami                               # 계정 확인(rjsgml13486 계정)
npx wrangler deployments list | head              # ★현재 활성 버전 ID를 기록 = 롤백 목표
npx wrangler secret list                          # 3종 이름만 확인(GATE_ACCESS_CODE·GATE_SESSION_SECRET·UPSTAGE_API_KEY)
```
- 시크릿 추가·변경 **불필요**(RC는 동일 3종 사용). RATE_LIMIT_TEST_MODE 등록 금지 유지.
- 현재 기록된 롤백 목표: `cece759c-90c0-4788-99d6-6a8412cf59e1`(1차 버전) — 배포 직전에 재확인.

### B-1. 배포
```
npm run build
npx vinext deploy
```
- 출력 확인: `Uploaded gapproof-mvp`, 바인딩 4종(ASSETS·IMAGES·ANALYZE/GATE_RATE_LIMITER). workers.dev 경고는 무해(무시).
- 다운타임 0(원자 전환). 프런트·API가 한 워커라 **버전 불일치 구간 없음**. 정적 자산은 해시 파일명이라 캐시 무효화 불필요(HTML은 무캐시).

### B-2. 즉시 smoke test (10분 내)
```
npx wrangler deployments list | head              # 새 버전 ID 기록
npx wrangler tail gapproof-mvp --format pretty    # 로그 병행(민감정보 미출력 확인 겸)
```
브라우저/CLI 확인(순서):
1. `/` 200 = **공개 홈**(게이트 아님) · `/demo` = 게이트 · `/demo?sample=1` = 무코드 샘플
2. `/why` `/who` `/privacy` `/terms` 200 · manifest·favicon·og 200
3. 샘플 여정 STEP4 완주(실 Solar 0회)
4. 데모 코드 입장 → 실분석 **1회**(전체 예산 1회): "Solar 실연결 · 모델명" 배지 + V2 필드(사실 상태·근거 강도·가설) 표시 확인
5. 보안 헤더 5종(curl -D) · console error 0
6. HTTPS 인증서 · 리다이렉트 루프 없음

### B-3. 롤백 기준·절차
즉시 롤백 조건: 홈/데모 5xx, 게이트 정상 코드 인증 불가, 자산 대량 404, PII 노출, 분석 흐름 차단.
```
npx wrangler rollback            # 직전 버전(=1차 cece759c)으로 복귀
# 또는 대시보드 Workers & Pages → gapproof-mvp → Deployments → 기록해 둔 버전 선택 → Rollback
```
롤백 후 `/` 200 + 게이트(1차 화면) 재확인. 원인은 이슈로 기록, 로컬 재현 후 재승인 요청.

## 경로 A′ — Preview 검증을 원할 경우(선택)

1. [사용자·대시보드] workers.dev 서브도메인 등록(1회)
2. `npx wrangler versions upload` → preview URL에서 B-2의 1~3 검증(실 Solar 호출 금지)
3. 이상 없으면 `npx wrangler versions deploy`로 승격 → B-2의 4~6 수행
4. 실패 시 승격하지 않으면 운영 무영향

## 로그·모니터링

- 실시간: `wrangler tail`(스모크 동안) — API 키·코드·PII 미출력 확인
- 사후: Cloudflare 대시보드 Workers 메트릭(오류율·요청 수)

## 금지·주의

- 이 문서의 어떤 명령도 사용자 승인 전 실행 금지(본 세션에서 실행하지 않았음)
- 실제 Solar 호출은 smoke의 **1회가 전체 예산** — 429 검증이 필요하면 무과금 경로(20자 미만 11회, deploy-plan.md §7)만 사용
- 시크릿 값은 어떤 채널에도 기록 금지
