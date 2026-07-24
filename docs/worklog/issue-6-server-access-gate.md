# Issue #6 — 서버 검증 기반 데모 접근 게이트와 API 보호

- Issue: https://github.com/forblune/gap-proof-mvp/issues/6
- 브랜치: `security/6-server-access-gate` (기준 커밋 `b8bb24a` = main)
- 작업일: 2026-07-25

## 설계 결정

1. **환경변수 접근**: `process.env`만 의존하지 않음 — 신규 `app/lib/server-env.ts`가 `cloudflare:workers`의 `env` 바인딩을 우선 읽고, Node 실행(빌드 산출물 테스트 하네스)에서만 `process.env`로 폴백. #16에서 실측한 "workerd에서 process.env 미주입" 문제에 대한 대응이며, analyze의 `UPSTAGE_API_KEY`/`SOLAR_MODEL` 판독에도 동일 적용(모듈 상수였던 MODEL을 요청 시 판독으로 변경).
2. **게이트 계약**: `POST /api/gate`(코드 검증→서명 쿠키 발급), `GET /api/gate`(세션 상태 — HttpOnly라 클라이언트가 쿠키를 읽을 수 없으므로 필요). 코드 값은 `GATE_ACCESS_CODE`, 서명 비밀은 `GATE_SESSION_SECRET` — **소스에 값 없음**, 비교는 고정시간 비교.
3. **세션**: HMAC-SHA256(WebCrypto) 서명 토큰 `v1.<만료>.<서명>`을 **HttpOnly + Secure + SameSite=Strict** 쿠키(12시간)로 발급. 위조·만료·형식 오류 전부 거부.
4. **fail-closed**: `GATE_ACCESS_CODE` 또는 `GATE_SESSION_SECRET` 미구성 시 — 게이트 발급 503(`gate_not_configured`), 세션 검증 항상 실패 → analyze 401. 환경변수 누락이 "열림"이 되는 경로 없음.
5. **비용 경로 보호**: `/api/analyze`는 **본문 파싱 이전에** 세션을 검사해 비인증 요청이 폴백 생성·Solar 호출에 도달하지 않음. 비인증 응답은 JSON 401(`unauthorized`).
6. **공개/보호 경계**: 시작 화면(소개·원칙·동의)은 코드 없이 공개. "샘플 여정 시작하기" 클릭 시 세션이 없으면 게이트 화면(코드 입력) 표시. "계정 로그인이나 개인 비밀번호가 아니다"라는 오해 방지 카피 포함. 분석 중 401(만료)이면 입력을 유지한 채 게이트로 복귀.
7. UI: Enter 제출, 빈 값은 버튼 비활성, 오답·미구성·연결 오류는 서버 메시지를 오류 notice로 표시. 게이트 통과 여부는 새로고침 후 `GET /api/gate`로 복원.

## 변경 파일

- 신규: `app/lib/server-env.ts`, `app/lib/gate-session.ts`, `app/api/gate/route.ts`, `app/types/cloudflare-workers.d.ts`(최소 앰비언트 타입 — 기존 `db/index.ts`의 tsc 오류도 함께 해소), `.dev.vars.example`(키 이름만)
- 수정: `app/api/analyze/route.ts`(선행 인증 + env 판독 교체), `app/page.tsx`(게이트 화면·401 처리·세션 상태 조회), `app/globals.css`(게이트 스타일), `README.md`(env 이름·게이트 설명), `tests/rendered-html.test.mjs`

## 검증 결과

**자동(node:test, 6/6 PASS)** — 신규 게이트 테스트: 비인증 분석 401 JSON / 위조 쿠키 401 / 빈 코드 400·오답 401 / 정답 → 쿠키 플래그(HttpOnly·Secure·SameSite=Strict) 검증 → 세션 상태 true → 분석 200 / **fail-closed**(env 제거 시 정답 코드도 503, 기존 세션도 401). 기존 경계값·폴백 테스트는 세션 쿠키를 얻어 유지. 테스트 게이트 값은 테스트 전용 문자열(실서비스 값 아님).

**E2E(Playwright, 하네스 — UPSTAGE 미설정·게이트 env 설정, `docs/evidence/issue-6/results.json`)**
- 공개 소개 코드 없이 렌더 → 시작 클릭 시 게이트(password 입력·autofocus) → 오답 오류 notice → 정답+Enter → STEP 1
- 쿠키 실측: `httpOnly:true, secure:true, sameSite:"Strict"`
- 새로고침 후 세션 유지(게이트 생략), 쿠키 삭제 후 분석 → 401 → 게이트 복귀 + **입력 57자 보존** → 재인증 → 분석 완료. 페이지 오류 0

**실제 workerd dev 서버(`dev-server-failclosed.txt`)**
- `GET /api/gate` → authorized:false / 미구성 게이트 POST → **503 fail-closed** / 비인증 분석 → **401**(실키가 `cloudflare:workers` env로 도달 가능한 런타임에서 비용 경로 차단 확인) / 공개 페이지 200
- dev에서 인증 성공 경로는 의도적으로 미실행: dev의 게이트가 미구성(fail-closed)이라 세션 발급이 불가하고, 세션이 있었더라도 실키로 유료 Solar가 호출될 수 있어 성공 경로는 하네스(키 없음)에서만 검증

**정적**: `npm run lint` 통과 · `git diff --check` 통과 · tsc **레거시 2건만 잔존**(`worker/index.ts` — 기존 3건 중 `db/index.ts` 건은 본 이슈의 타입 선언으로 해소) · 비밀값·`.dev.vars` 내용 미출력(증거 파일 스캔 0건)

## 남은 제한사항 / 후속

- 프로덕션에서 게이트를 열려면 `wrangler secret put GATE_ACCESS_CODE` / `GATE_SESSION_SECRET` 등록 필요(사용자 작업 — 값은 채팅·저장소에 기록 금지). 등록 전 배포하면 fail-closed로 데모가 잠김(안전하지만 심사 불가) — **배포 전 체크리스트에 포함**.
- rate limit·PII 마스킹은 #7 범위(이 이슈에 섞지 않음). Secure 쿠키는 localhost에서 Chromium 계열이 허용함을 실측 — Safari 로컬 테스트는 QA #12에서.
- `cloudflare:workers` env 도입으로 **프로덕션 Solar 실연결 가능성이 복원**됐을 수 있음(#7의 주입 검증 항목에서 최종 확인).

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입 — Closes #6)
