# Issue #4 — 모바일·태블릿 반응형과 터치 사용성 보강

- Issue: https://github.com/forblune/gap-proof-mvp/issues/4
- 브랜치: `fix/4-mobile-responsive` (기준 커밋 `ffa5e81` = main)
- 작업일: 2026-07-24

## Before 문제 (Playwright 정량 측정, `docs/evidence/issue-4/metrics-before.json`)

- 로딩 스켈레톤이 360/390/768/1024px에서 **3열 고정** — 카드 폭 98/108/222/307px로 압축
- 모바일(≤720px)에서 "기록 삭제" 버튼 `display:none` — 삭제 진입점 소실, Tab 순서에서도 제외
- 진행표시가 모바일에서 숫자만 남음(현재 단계 라벨 없음)
- 터치 영역 미달: 확인/거절/수정 39px, 편집 저장·취소 30px, 직무 선택 40px
- 근거 링크 입력 12px → iOS 포커스 자동 확대 유발
- notice 토스트가 `left:50%` shrink-to-fit 특성으로 뷰포트의 50% 폭에 갇혀 좁고 길게 표시
- 721~1050px 태블릿 구간: 데스크톱 패딩·헤더 밀도 그대로
- 가로 overflow는 전 뷰포트 0(문제 없음 확인), console error 0

## 주요 CSS 결정

1. **스켈레톤 1열화는 기본 정의 뒤에 배치** — `.skeleton-claims` 기본 규칙이 파일 후반부에 있어 앞쪽 미디어쿼리 override가 무효(동일 특이성·후행 우선). 스켈레톤 정의 직후에 전용 `@media (max-width:1050px)` 블록 추가로 해결.
2. 기록 삭제: 모바일 숨김 제거, 시각은 밑줄 텍스트 유지(`text-decoration`으로 전환)하되 패딩으로 44px hit area 확보. 헤더 과밀 방지로 badge `max-width:44vw`+ellipsis(`.sample-badge-text` 래퍼 추가 — page.tsx 1줄 변경).
3. notice: `width:max-content` + `max-width:min(560px, calc(100vw-32px))`로 50vw 갇힘 해소·가장자리 16px 보장.
4. 터치 44px: `.claim-actions button`·`.claim-editor button`·`.role-select button`·`.check-opt` `min-height:44px`, 버튼 간 gap 5→8px.
5. 입력: `.evidence-link input` 12→16px(iOS 확대 방지). 긴 역량명·URL은 `overflow-wrap:anywhere`(proof-skill/strength-row/brief-columns/claim-card h2).
6. 태블릿(≤1050px): topbar/page-shell/progress-wrap/site-footer 패딩 36→24px로 밀도 완화.
7. 뷰포트 안정성: `100vh` → `100svh` 폴백 병기(hero·flow-page). safe-area는 topbar·page-shell 좌우에 `max(18px, env(safe-area-inset-*))` 적용. 하단 고정 요소는 원래 없어 추가 조치 불필요(가림 없음 확인).
8. 진행표시: 전체 재설계 없이 `.progress li.active b`만 표시(+`white-space:nowrap`) — 모바일에서 현재 단계명 인지 가능.

## 변경 파일

- `app/globals.css` (반응형·터치·notice·태블릿·safe-area·스켈레톤)
- `app/page.tsx` (배지 텍스트 `.sample-badge-text` 래퍼 1곳)
- `docs/evidence/issue-4/` (Before/After 캡처 8장 + 메트릭 JSON 2개)

## 5개 뷰포트 결과 (After, `metrics-after.json`)

| 뷰포트 | overflow | 스켈레톤 | 기록삭제 | 현재단계 라벨 | 주요 터치 | console error |
|---|---|---|---|---|---|---|
| 360×800 | 0 | 1열(324px) | 노출·44px | 표시 | 44px | 0 |
| 390×844 | 0 | 1열(354px) | 노출·44px | 표시 | 44px | 0 |
| 768×1024 | 0 | 1열(720px) | 노출·44px | 표시 | 44px | 0 |
| 1024×768 | 0 | 1열(976px) | 노출·44px | 표시 | 44px | 0 |
| 1440×900 | 0 | 3열(데스크톱 유지) | 노출·44px | 표시 | 44px | 0 |

- 근거 입력 폰트 12px→16px(전 뷰포트), notice 360px에서 328px 폭·좌우 16px 여백
- 키보드: 모바일 Tab 순서에 기록삭제 버튼 진입 확인(Before에는 불가)
- 데스크톱(1440) 히어로·2열 레이아웃 회귀 없음(캡처 확인)

## 테스트 결과

- `npm test`(build 포함): **4/4 PASS**
- `npm run lint`: PASS
- `npx tsc --noEmit`: 이번 변경 파일 오류 0건. 기존 템플릿 잔재 3건(`db/index.ts` cloudflare:workers, `worker/index.ts` Fetcher/D1Database)은 STATUS 문서에 기재된 알려진 무해 오류로 변경 전과 동일
- `git diff --check`: 통과
- 검증 환경: dev 서버가 기동 불가(아래 후속 이슈)라, 테스트와 동일 방식으로 빌드 산출물 Worker를 Node http로 감싼 로컬 하네스(포트 3100, 스크래치패드 전용·저장소 무변경) + Playwright(전역 설치본) 사용

## 남은 제한사항

- 실기기(iPhone Safari·Android Chrome) 실측과 주소창 변화 시 svh 동작 확인은 QA(#12)에서 수행
- `.source` 입력 소스 칩은 원래 onClick 없는 장식 요소라 터치 보강 대상에서 제외(기능화/제거는 후속 판단)
- 가로 모드 노치(safe-area) 실측은 QA(#12)

## 후속 Issue 후보 (이번 범위에 포함하지 않음)

1. **로컬 dev 서버 기동 불가**: `wrangler.jsonc`의 `compatibility_date "2026-07-23"` > 로컬 workerd 최대 지원일 "2026-05-22" → `MiniflareCoreError [ERR_RUNTIME_FAILURE]`. 날짜 하향 또는 wrangler 업데이트 필요(배포 영향 검토 포함)
2. 인쇄 CSS `.identity` 배경색 가독성(감사 F절) — #12에서 실측 후 판단
3. `.source` 칩 기능화 또는 제거

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입 — Closes #4)
