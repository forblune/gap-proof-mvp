# GapProof 배포 토폴로지 (실측 확정, 2026-07-25)

추측이 아니라 DNS·응답 헤더·저장소 설정·배포 이력으로 확정한 사실만 기록한다.

## 확정 결과

| 항목 | 값 | 근거(실측) |
|---|---|---|
| 도메인 | `gapproof.forblune.com` | — |
| **실제 배포 플랫폼** | **Cloudflare Workers** (단일 워커 `gapproof-mvp`) | 응답 헤더 `server: cloudflare` + `cf-ray`, DNS A 104.21.15.243/172.67.209.48(Cloudflare 프록시 대역), 저장소에 `wrangler.jsonc`만 존재 |
| 프런트 | 같은 워커의 정적 자산(ASSETS 바인딩, `dist/client`) | wrangler.jsonc `assets` |
| API | 같은 워커의 서버 라우트(`/api/gate`, `/api/analyze`, `/api/share-config`) | worker/index.ts → vinext app-router-entry |
| 데이터 저장소 | **없음**(서버 무저장 설계). 회원 기반 Supabase는 로컬 설계만(운영 미연결) | privacy v0.1·ADR-0001 |
| 인증 | 데모 코드 → HMAC 서명 HttpOnly 쿠키(12h). 계정 없음 | app/lib/gate-session.ts |
| AI 호출 | 워커 → Upstage Solar API(서버 측, 키는 wrangler secret) | app/api/analyze/route.ts |
| 자동 배포 트리거 | **없음** — GitHub Actions·CI 부재. 배포는 로컬에서 `npx vinext deploy` 수동 실행 | `.github/workflows` 없음, package.json에 deploy 스크립트 없음 |
| 운영 rollback | Cloudflare 대시보드 Deployments에서 버전 선택 롤백 또는 `npx wrangler rollback` | Phase B-1 실증(runbook 참조) |
| **Render 사용 여부** | **사용 안 함** — render.yaml 없음, 응답 지문 없음. **Render MCP 연결 문제는 GapProof 배포 Blocker가 아님** | 실측 |
| **Vercel 사용 여부** | 사용 안 함(vercel.json·x-vercel-id 없음) | 실측 |
| GitHub Pages | 사용 안 함(운영이 Workers 지문) | 실측 |

## 현재 운영 버전

- 활성: `cece759c-90c0-4788-99d6-6a8412cf59e1` (2026-07-25T05:42Z, 100%) = **1차 제출 버전**(main `19c8c48` 시점 빌드)
- 직전(롤백 체인): `9c0145d5-…`(유실 소스 구버전, 2026-07-23)
- 시크릿(이름만): GATE_ACCESS_CODE · GATE_SESSION_SECRET · UPSTAGE_API_KEY — 3종 확인(2026-07-25), RC도 동일 3종만 필요(추가 시크릿 불필요)

## 핵심 함의

1. **main 병합은 배포를 일으키지 않는다**(자동 배포 부재) — 병합과 배포는 독립된 두 단계.
2. RC는 같은 워커 이름으로 배포되므로 배포 즉시 운영 도메인이 교체된다(preview 채널 없음 — Runbook 경로 B).
3. workers.dev 서브도메인은 계정에 미등록 — 배포 출력의 경고는 무해(운영 도메인만 사용).
