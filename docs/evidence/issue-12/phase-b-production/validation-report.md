# Issue #12 Phase B-1 — 운영 배포·자동 검증 결과 (2026-07-25)

승인 근거: 사용자 명시 배포 승인(Phase B-1, 기준 main `19c8c48`). 비밀값·게이트 코드는 이 문서에 기록하지 않는다.

## 1. 배포

| 항목 | 값 |
|---|---|
| Worker | `gapproof-mvp` (계정 rjsgml13486@gmail.com, ID 8e7db1ee…977c) |
| 배포 전 활성 버전(롤백 목표) | `9c0145d5-bc1a-4027-8a5c-98cbb2b2b081` (2026-07-23T08:43:20Z — 유실 소스 구버전) |
| 배포 명령 | `npm run build` → `npx vinext deploy` (1회) |
| **배포 후 활성 버전** | `cece759c-90c0-4788-99d6-6a8412cf59e1` (2026-07-25T05:42:33Z, 100%) |
| 업로드 | 1318.81 KiB(gzip 293.13) · Worker Startup 18ms · 자산 12/12 |
| 바인딩(출력 확인) | ASSETS · IMAGES · ANALYZE_RATE_LIMITER(10/60s) · GATE_RATE_LIMITER(10/60s) |
| Custom Domain | `gapproof.forblune.com` — 신버전 서빙 확인(신버전 전용 `/manifest.webmanifest` 200) |
| workers.dev | **계정에 서브도메인 미등록 → workers.dev URL 자체가 없음.** 배포 출력에 등록 안내 경고(대시보드 변경은 금지 범위라 미등록). smoke test는 운영 도메인에서 수행 |
| 다운타임 | 0 (원자적 버전 전환) |
| 시크릿 | 이름만 확인: GATE_ACCESS_CODE·GATE_SESSION_SECRET(사용자 직접 등록), UPSTAGE_API_KEY(기존 값 유지 — 미열람). 금지 변수(KAKAO_JS_KEY/ONTONGYOUTH_API_KEY/RATE_LIMIT_TEST_MODE/SOLAR_MODEL) 미등록 확인 |
| 롤백 | **불필요** — 판단 기준(§9) 해당 없음. 필요 시: 대시보드 Deployments에서 `9c0145d5…` Rollback 또는 `npx wrangler rollback` |

## 2. 기본 URL 상태표 (https://gapproof.forblune.com)

200: `/` `/about` `/guide` `/how-it-works` `/technology` `/manifest.webmanifest` `/favicon.svg` `/favicon.ico` `/icon-192.png` `/icon-512.png` `/apple-touch-icon.png` `/og.png`(IHDR 1200×630 실측) `/robots.txt` `/sitemap.xml`
404(기대값): `/no-such-page-xyz` `/privacy` `/terms`(제출 비차단 후속) · 예상 밖 5xx **0건** · HTTPS 인증서 정상 · 비인증 `/`는 게이트만 노출(데모 본문·`#experience` 미노출, A1 마크 존재)

## 3. 보안 헤더 (curl -D 실측)

`x-content-type-options: nosniff` · `x-frame-options: DENY` · `referrer-policy: strict-origin-when-cross-origin` · `permissions-policy: camera=(), microphone=(), geolocation=()` · `content-security-policy: frame-ancestors 'none'` — 5종 전부 존재, 누락 없음

## 4. 게이트·세션

- 비인증 `/api/analyze` → **401** · 오답 코드 → 401 `invalid_code` · 정답 코드 → 세션 발급
- Set-Cookie(값 마스킹): `gp_gate=<…>; Max-Age=43200; Path=/; HttpOnly; Secure; SameSite=Lax` — 요구 3속성 전부 확인
- 데모 잠금 → 게이트 복귀 + **새로고침 후에도 게이트 유지**(쿠키 삭제 실증, `13-after-lock.png`)
- 새 세션(별도 브라우저 컨텍스트)은 항상 게이트부터 — 상태 분리 확인

## 5. 실제 Solar 검증 — 호출 정확히 1회

입력: 테스트 전용 데이터(항공물류 전공 서술 + `test@example.com`·`010-0000-0000` — 실제 개인정보 아님)

| 확인 항목 | 결과(스크린샷 `04-claims-1440.png`, `06-step4-1440.png`) |
|---|---|
| 실연결 표시 | 헤더 배지 **"Solar 실연결 · solar-pro3"**(녹색) — 샘플 배지와 명시 구분, notice "Solar solar-pro3 분석 완료" |
| 분석 결과 | 역량 후보 3건 생성(항공물류 전공 / AI 수학 및 웹 독학 / 물류 데이터 대시보드 개발) |
| 근거 인용 | 각 카드 인용이 입력 원문 문장과 일치, 출처 "사용자 입력" 표기 |
| **PII 마스킹** | notice에 "이메일·전화번호(으)로 보이는 정보는 가리고 분석했어요" 고지. **인용·카드·STEP4 어디에도 원문 이메일·전화번호 미노출**(화면 실측) |
| 확인 0개 차단 | "0개 확인됨 · 최소 1개를 확인해 주세요" + 다음 버튼 비활성 → 1개 확인 후 활성 |
| 확인·수정·제외 | 카드별 [거절]/[표현 수정]/[맞아요] 동작 |
| 결과 카드·Gap Brief | STEP4 개인용 증거카드(목표직무·Lv.0 자기기록·대표 근거·다음 행동·"Solar solar-pro3 제안 → 사용자 확인 완료"·2026.07.25) + Gap Brief(강점/우선 격차 Lv 표기/상담 질문/공유 범위/검토 필요) |
| 판정 아님 고지 | 푸터 "Solar 실연결 · 취업 또는 적성 판정이 아닙니다" |
| 삭제·잠금 | 확인 바 표시 → 취소(입력 보존) → 확정(STEP0 초기화) → 데모 잠금(게이트 복귀) — `followup-findings.json` |
| console error | **0** (본검증·후속검증 모두) |

첫 호출 성공 — 재시도 불필요. 전체 Phase B-1의 실 Solar 호출 합계: **1회**.

## 6. 무과금 Rate Limit 검증 (Solar 추가 호출 0회)

- 경로: 인증 세션 + 20자 미만 본문(rate limiter가 길이 검증·Solar보다 먼저 소모되나, 길이 검증에서 단락)
- **단일 keep-alive 연결**: 요청 1~10 → 400 `input_too_short`, **요청 11·12 → 429 `rate_limited` + `retry-after: 60`** ✅
- Worker 로그에 `rate_limit_unavailable` 0건(바인딩 정상)
- **발견 사항(정직 기록)**: 연결을 매번 새로 여는 클라이언트(curl 개별 실행 26회)에서는 429 미발생 — Workers Rate Limiting API 카운터가 **엣지 서버 단위 근사(per-server best-effort)** 라 요청이 분산되면 서버별 한도에 도달하지 않음. Cloudflare 문서상 특성이며, 연결을 재사용하는 실제 브라우저에는 유효. 분산 공격 대비 전역 강제 한도가 필요하면 Durable Objects/KV 기반 카운터가 후속 과제(#13 계열)
- 게이트 limiter: 부하 시도는 운영 방해 위험으로 이연(오답 1회 401만 확인). 코드 경로는 Phase A 테스트로 검증됨

## 7. UI 회귀·인쇄

- STEP4 상태 재사용으로 5뷰포트(360/390/768/1024/1440) 스크린샷 — 가로 잘림 없음(`07-step4-*.png`). 수치 측정은 스크립트 중단으로 소실 → **시각 검증 + `/about` 5뷰포트 수치(overflow 전부 OK) + 동일 번들의 Phase A 로컬 수치(0/0)** 로 갈음(정직 기록)
- 정보 페이지 5뷰포트 overflow: 전부 OK · console error 0
- 인쇄(#26): print 에뮬레이션 + 배경 OFF 근사에서 목표직무명 잉크색 가시·크롬 숨김·카드 2종 표시(`08-print-bg-off.png`) · `print.pdf` **1페이지**(확인 주장 1건의 콘텐츠 분량 — 로컬 리허설은 2p, 1~2p 범위 내·빈 페이지 없음·잘림 없음)
- A1 브랜드: 게이트·헤더·증거카드 마크, 탭 favicon 응답, OG 1200×630 — 전부 신자산. 구 자산 캐시: 서버 응답은 신버전(브라우저·카카오 캐시는 수동 확인 항목)

## 8. Worker 로그 점검 (`wrangler tail` 526줄, 검증 세션 전체)

- 원문 PII(`test@example.com`/`010-0000-0000`) **0건** · 시크릿·쿠키 값(`gp_gate=`/GATE_*/UPSTAGE) **0건** · `rate_limit_unavailable` **0건**

## 9. 검증 중 결함·이슈

1. (검증 스크립트 자체 결함 — 앱 아님) 삭제 확정 버튼 라벨을 정규식으로 잘못 짚어 1차 실행이 삭제 단계에서 중단 → 라벨 확인 후 무Solar 후속 스크립트로 완료. 이 과정에서 STEP4 overflow 수치·findings.json 일부 소실(§7에 대체 근거 기록)
2. workers.dev 서브도메인 미등록(§1) — 기능 영향 없음, 등록 여부는 사용자 선택(대시보드)
3. 앱 결함: **발견 0건** — 롤백 기준 해당 없음
