# 라이브 배포 기준(롤백 기준) 기록 — 2026-07-24

Issue #3에서 작성. 이후 모든 이슈의 Before/After와 배포 판단의 기준선이다.

## 라이브 서비스

- URL: https://gapproof.forblune.com (Cloudflare Workers)
- 접근: 접근 코드 게이트 존재(코드 값은 이 문서에 기록하지 않음)
- 배포 주체: `npx vinext deploy` (STATUS 문서 기준)
  - 📌 **2026-07-24 시점 기록이며 현재 배포 명령이 아니다.** 현행 명령은 `npm run deploy`
    (`preflight-env` → `build` → `verify-build-output` → `wrangler deploy`).

## 로컬 코드와 라이브의 확인된 격차 (2026-07-24 감사 확정)

라이브에는 있(었)다고 문서에 기록됐으나 **로컬 소스에는 없는 기능** — 소스 소실로 재구성 대상:

1. 접근 코드 게이트 (`page.tsx` + `api/analyze` 검증) → 재구성: Issue #6
2. `app/api/resources/route.ts` (온통청년 + YouTube)
3. analyze 보안 (PII 마스킹·rate limit) → Issue #7
4. `GPT_PROMPT` (경험 정리 프롬프트 복사)
5. 디자인 "방향 1 신뢰형" (딥틸 `#127c6b`·체크 로고) — 로컬은 이전 아이보리/옐로우 스킨

## ⛔ 배포 차단 (deploy 금지)

- 로컬 코드를 지금 배포하면 위 라이브 기능들을 **덮어써 소실**시킨다.
- **Issue #6 완료 + 사용자 명시적 승인 전 `deploy` 금지.** (Tracking #2 고정 사항)

## 롤백 기준

- 롤백 목표 = 현재 라이브 배포본(위 기능 포함 상태).
- 롤백 수단: Cloudflare 대시보드 Workers 버전 롤백 기능. 단 라이브는 컴파일 번들이라 소스 복원 수단은 아님.
- [확인 필요 — 사용자] Cloudflare 대시보드에서 현재 활성 배포 버전 ID·배포 시각을 확인해 아래에 기록:
  - 활성 버전 ID: (미기록)
  - 배포 시각: (미기록)
- [확인 필요 — 사용자] 라이브 기준 화면 캡처(게이트, 홈, STEP1~4 각 1장)를 `docs/evidence/live-baseline/`에 보관 권장.
  로컬 세션에서는 라이브 접속·역공학을 하지 않으므로 사용자 확보가 필요하다.

## 비밀값 규칙

- `.dev.vars`(및 `.dev.vars.*`)는 Git에서 제외(`.gitignore:43-45`)하며 내용을 읽거나 기록하지 않는다.
- 프로덕션 키는 `npx wrangler secret put UPSTAGE_API_KEY` 방식(STATUS 기준). 값은 어떤 문서에도 기록하지 않는다.
