# 배포 전·롤백 체크리스트 (초안 v1 — Phase A, 실행 금지 상태)

⛔ 실행 조건: #24(브랜드 자산) 교체 + Phase B 검증 + **사용자의 명시적 배포 승인** 후에만.
현재 deploy·프로덕션 시크릿 등록은 금지 상태다.

## A. 배포 전 (순서대로)

1. [ ] main 최신·작업 트리 클린, `npm test`·`npm run lint`·`npm run build` 그린
2. [ ] 브랜드 자산 교체 완료(#24) — favicon/og/아이콘이 플레이스홀더가 아님
3. [ ] 라이브 기준 재확인: `docs/evidence/live-baseline.md`의 [확인 필요] 항목(현 활성 배포 버전 ID·기준 캡처)을 Cloudflare 대시보드에서 채움 → **롤백 목표 확정**
4. [ ] 프로덕션 시크릿 등록(값은 채팅·저장소 기록 금지):
   - `npx wrangler secret put UPSTAGE_API_KEY`
   - `npx wrangler secret put GATE_ACCESS_CODE`
   - `npx wrangler secret put GATE_SESSION_SECRET`
   - `npx wrangler secret put SOLAR_MODEL` (선택 — allowlist 내 값만)
   - `npx wrangler secret put KAKAO_JS_KEY` (선택 — 없으면 카카오 버튼 미표시)
5. [ ] rate-limit 바인딩: `wrangler.jsonc`의 `ratelimits`가 배포 산출물에 상속됨(#7 검증) — 별도 등록 불필요, 배포 후 실동작 확인만
6. [ ] 배포 명령: `npx vinext deploy` (STATUS 문서 기준 — 실행 전 dry-run/출력 확인)
   > 📌 **이 줄은 2026-07 당시 기록이며 현재 배포 명령이 아니다.** 현행 명령은 `npm run deploy`
   > (`preflight-env` → `build` → `verify-build-output` → `wrangler deploy`). `docs/deployment/GAPPROOF_RELEASE_RUNBOOK.md` 참조.

## B. 배포 직후 확인 (10분 내)

1. [ ] `GET /` 200 + 게이트 화면(비인증) + OG 메타 존재
2. [ ] 접근 코드 → 세션 발급(HTTPS이므로 **Secure 쿠키 포함** 확인) → 데모 열림
3. [ ] `/api/analyze` 비인증 401 · 인증 후 정상(키 등록 시 `Solar 실연결 · <모델>` 배지)
4. [ ] 게이트 오답 연속 → 429(Retry-After 60) — 엣지 rate limit 실동작
5. [ ] `/about`·`/robots.txt`·`/sitemap.xml` 200, 카카오 OG 디버거로 미리보기 확인
6. [ ] 보안 헤더 5종 존재(curl -D)
7. [ ] 콘솔 오류 0 (Chrome/모바일 1회씩)

## C. 실패 시 롤백

1. Cloudflare 대시보드 → Workers & Pages → gapproof-mvp → Deployments/Versions
2. 직전 정상 버전(A-3에서 기록한 버전 ID) 선택 → **Rollback**
3. 롤백 후 B-1·B-2 재확인, 실패 원인은 이슈로 기록 후 로컬에서 재현·수정
4. 시크릿 오등록이 원인이면 `wrangler secret put`으로 값만 교체(코드 롤백 불필요)

## D. 기록

- 배포 버전 ID·시각, B 체크 결과, 발견 사항을 `docs/worklog/`와 Tracking #2에 남긴다.
