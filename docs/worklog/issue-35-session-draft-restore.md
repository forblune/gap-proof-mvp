# Issue #35 — Gate 1 P0: 재인증 시 진행 단계·입력 draft 보존

- Issue: #35 · 브랜치 `fix/35-session-draft-restore`(base `rc/professor-feedback` `354cd1c`) · 작업일 2026-07-25

## 재현·원인

- **재현**: 페이지 재시작(인앱 브라우저 앱 전환·새로고침) 시 모든 진행 상태가 useState 기본값으로 초기화 — 코드 실측(`app/page.tsx` 상태 15종이 메모리 전용). 세션 만료 401은 메모리 상태를 유지하지만(기존 처리), 인앱 브라우저는 재인증 과정에서 페이지 자체를 재시작하는 경우가 많아 사실상 입력 소실.
- **원인**: 진행 상태의 영속 계층 부재.

## 수정

- **`app/lib/draft.ts` 신설**(순수 함수 — MindHub data-access seam 패턴 적용): `DraftV1` 스키마(v·savedAt·step·동의 2·experience·claims·roleId·passedChecks·분석 상태 4·selectedAction·proofDate), 엄격 검증 `parseDraft`(구조 위반 시 전부 null — 오염 복원 금지), `load/save/clearDraft`(storage 예외 안전 — 프라이빗 모드).
- **복원**: 마운트 1회 effect에서 draft 적용(SSR 하이드레이션 일치를 위해 useState 초기값이 아닌 effect 사용 — 근거 주석). 게이트와 독립이므로 재인증 후 원래 단계·입력·확인 상태로 복귀.
- **저장**: 상태 변경 effect. 마운트 첫 실행은 저장하지 않음(기존 draft 덮어쓰기 방지 가드), `loading` 상태 미저장. **URL·서버로는 어떤 입력도 전송하지 않음.**
- **소거**: 공통 `resetJourneyState()`로 리팩터 — 새 샘플·기록 삭제·**데모 잠금**이 draft 소거+저장 가드 해제. 잠금은 공용 기기 이탈 신호로 보고 화면 상태도 함께 소거(기존 "입력 유지" 동작 변경 — 사유 코드 주석).
- **만료 문구**: 분석 401 시 "데모 이용 시간이 만료되었어요. 작성한 내용은 이 기기에 잠시 보관했습니다. 다시 인증하면 이어서 진행할 수 있어요." — draft가 실재하므로 보존 문구 사용 조건 충족(승인 문구).

## 테스트·검증

- **신규 단위 5종** `tests/draft.test.mjs`(npm test 편입 → 총 20/20): 왕복 보존·깨진 입력 null·범위/타입 위반 null(step·상한·claims·checks·source)·storage 계약·예외 storage 안전
- **소스 계약 갱신**: rendered-html 테스트의 삭제 계약을 `resetJourneyState("", [])`+`clearDraft` 패턴으로 갱신(의도 동일)
- **통합 검증** `tests/e2e/draft-verify.cjs`(하네스·Solar 무호출) — **Chromium·WebKit 각 10/10 PASS**(`docs/evidence/issue-35/*.json`): 새로고침 후 STEP1 텍스트·STEP2 주장/확인 복원, 쿠키 소거→분석→만료 문구+게이트→재인증→그 자리 복귀, 잠금 draft 소거+재인증 초기 상태, 삭제 draft 소거
- 배터리: lint 레거시 4 외 0 · tsc 레거시 2 외 0 · build 성공 · diff-check 통과 · 실 Solar 0회
- lint 특기: 복원 effect의 동기 setState는 `react-hooks/set-state-in-effect` 예외 처리(블록 disable + 사유 — SSR 하이드레이션 일치를 위한 표준 패턴)

## 알려진 아티팩트(앱 결함 아님)

1. 만료 시나리오에서 브라우저가 의도된 401 응답을 콘솔 error로 자체 기록(Chromium 1건) — 앱은 정상 처리, 검증기에서 의도 401만 허용 필터
2. WebKit 로컬 하네스에서 manifest CORS 로그 8건 — `metadataBase`로 manifest 링크가 운영 절대 URL이라 로컬에서 크로스 오리진이 됨(#24 기존 동작, 운영은 동일 출처로 정상 — B-1 실측). Gate 2/10에서 상대 경로 전환 검토 항목으로 이관

## 관련

- 커밋·PR: (생성 후 기입)
