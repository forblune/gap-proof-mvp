# Issue #5 — 입력·오류·삭제·결과 상태 표시 정확성 개선

- Issue: https://github.com/forblune/gap-proof-mvp/issues/5
- 브랜치: `fix/5-state-accuracy` (기준 커밋 `bdc2cc6` = main)
- 작업일: 2026-07-24

## 서버·클라이언트 계약 분석

- 서버(`app/api/analyze/route.ts`): 400 `input_too_short`("경험을 20자 이상…"), 413 `input_too_long`("경험은 3,000자 이내로…"), 400 `invalid_json`, 정상·폴백은 항상 200 + `{source, model, claims, notice}`. 길이 판정은 **trim 후** 기준.
- Before 클라이언트: `!response.ok`면 무조건 throw → catch에서 서버 메시지를 버리고 "연결 오류…" + **사용자 입력과 무관한 정적 `initialClaims`**로 STEP 2 이동.
- After 클라이언트: `!response.ok`(4xx) → 서버 `message` 그대로 오류 notice 표시, 입력·단계 유지, 샘플 대체 없음. catch(네트워크/서버 다운) → 입력·단계 유지 + 재시도 안내(정적 샘플 대체 제거). 서버 200 폴백(키 없음·타임아웃 등, 원문 기반 규칙 샘플)은 기존 그대로.

## Before 재현 결과 (`docs/evidence/issue-5/results-before.json`)

- 19자: 카운터 "19자"만, 비활성 사유 문구 없음
- 3,001자: 서버 413인데 화면은 STEP 2 이동 + "안전한 샘플 분석 완료"(정적 샘플) + notice 없음 + 입력 소실
- 오류 notice: 성공(초록) 스타일·role="status"
- 기록 삭제: 1클릭 즉시 전체 소실(확인 없음)
- 카드 날짜: `2026.07.22` 하드코딩, STEP4 도착 시 포커스 BODY

## 주요 UX 결정

1. **네트워크 장애도 정적 샘플 대체 제거** — "실연결/샘플 구분 명확" 원칙상, 사용자 입력과 무관한 데모 결과 생성은 오해 위험이 더 큼. 서버가 살아 있으면 원문 기반 폴백을 서버가 제공하므로 클라이언트 정적 대체는 불필요.
2. 길이 기준 통일: 서버·버튼 모두 trim 기준 → 안내 문구를 "앞뒤 공백을 뺀 20자 이상"으로 명시. `maxLength={3000}`으로 초과를 입력 단계에서 예방(서버 검증은 유지, 테스트로 계약 검증).
3. notice 의미 구분: `{text, kind}` 구조 + success(기존 초록 유지)/error(코럴+**"오류" 텍스트 태그** 병기 — 색상 단독 전달 금지)/info(중립). 오류는 `role="alert"`, 나머지 `role="status"`.
4. 삭제 확인: 모달 라이브러리 없이 고정 확인 바(`role="alertdialog"`). **취소가 autoFocus 기본 선택**, Escape 취소 → 트리거 버튼으로 포커스 복귀, 삭제 확정 시 기존 `deleteRecords` 전체 초기화 그대로.
5. 날짜: `proofDate` state — STEP3 "GapProof 만들기" 클릭 시점에 1회 생성(**사용자 로컬 시간 기준**으로 결정·주석 명시). 열려 있는 동안 불변, 인쇄도 동일 DOM. SSR은 STEP0만 렌더하므로 hydration 불일치 없음.
6. 결과 도착: STEP4 진입 시 h1(tabIndex=-1) 프로그램 포커스 → 스크린리더가 결과 도착을 인지. `window.scrollTo`는 `prefers-reduced-motion` 감지 시 `behavior:"auto"`(moveTo·reset·delete 공통).
7. 확인 역량 0개: STEP3→4 버튼을 `confirmedClaims·passedComps 모두 0`이면 비활성 + 사유 안내(zero-note: '이전'으로 확인 또는 경험 보강 안내). 현 UI 경로상 도달이 어려운 edge지만(STEP2 게이트) 제품 원칙("확인된 역량만 결과에 사용") 방어로 추가. 격차 엔진 재설계는 범위 외.

## 변경 파일

`app/page.tsx`(오류 계약·notice 구조·삭제 확인·날짜·포커스·0개 가드·길이 안내), `app/globals.css`(notice 변형·confirm-bar·length-hint·zero-note), `tests/rendered-html.test.mjs`(격리+경계값+계약 어서션), `docs/evidence/issue-5/`(캡처 10장+결과 JSON 2개)

## 경계값 테스트 결과 (자동, `npm test`)

- 19자 → 400 `input_too_short` + "경험을 20자 이상 적어 주세요." PASS
- 20자 → 200 `source:"sample"` PASS
- 3,000자 → 200 PASS
- 3,001자 → 413 + "경험은 3,000자 이내로 적어 주세요." PASS
- **테스트 격리**: 테스트 파일 상단에서 `UPSTAGE_API_KEY`/`SOLAR_MODEL`을 프로세스 env에서 제거 — 환경에 키가 있어도 실제 Solar 호출 0건(운영 코드에 테스트 우회문 없음)

## After 검증 (`results-after.json`, Playwright 390×844)

- 19자: 카운터 "19자 / 최소 20자 · 최대 3,000자" + 사유 문구 표시, 버튼 비활성
- 3,001자 입력 시도: maxLength로 3,000자에서 차단. 413 모의 응답 시 STEP1 유지 + "오류 경험은 3,000자 이내로…" notice + 입력 3,000자 보존 + 같은 버튼으로 재시도 가능
- 오류 notice: `notice error` + `role="alert"` + "오류" 태그
- 삭제: 확인 바 표시(포커스=취소) → Escape 취소 시 상태 유지·포커스 복귀 → 확정 시 초기화+완료 notice
- 카드 날짜: `2026.07.24`(당일), STEP4 도착 시 포커스 = H1
- 반응형 회귀: 5뷰포트 전체 여정 스윕 — overflow 0·console error 0·#4 개선치(스켈레톤 1열·44px·notice 폭) 유지

## 접근성 영향

- 오류가 라이브 리전(`alert`)으로 즉시 낭독, 성공/안내는 `status` 유지. 색+텍스트 태그 병행. 삭제 확인은 키보드(Tab/Enter/Escape) 완결, 포커스 복귀 구현. reduced-motion 사용자에 스무스 스크롤 비적용.

## 남은 제한사항

- 브라우저가 4xx fetch에 남기는 "Failed to load resource: 413" 콘솔 로그는 표준 동작(앱 JS 오류 아님·After 검증에서 유일한 콘솔 항목)
- 확인 역량 0개 상태의 실제 화면 캡처는 현 UI 경로로 재현 불가(위 7번) — 코드·테스트 어서션으로 검증
- 실기기 검증은 QA #12

## 후속 Issue 후보

- STEP2 도착 시에도 결과 영역 포커스 이동 검토(현재 STEP4만) — 접근성 보강 시
- `analysisNotice`(explain-strip)에 라이브 리전 부여 검토(#12 접근성 검증과 함께)

## 관련 커밋·PR

- 커밋: `eb69ca7` fix: accurate input, error, delete, and result state feedback (#5)
- PR: https://github.com/forblune/gap-proof-mvp/pull/17 (Closes #5)
