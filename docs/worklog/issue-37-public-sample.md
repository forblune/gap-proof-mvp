# Issue #37 — Gate 2b: 코드 없는 공개 샘플 체험

- Issue: #37 · 브랜치 `feat/37-public-sample`(base rc `8d7171f`) · 작업일 2026-07-25

## 구현

- **진입 2경로**: `/demo?sample=1`(홈 CTA "샘플로 둘러보기") + 게이트 카드의 "코드 없이 샘플 둘러보기" 버튼 — 둘 다 코드 불필요
- **비용 0 보장**: 샘플 모드의 분석은 서버 호출 없이 내장 예시 결과 사용(`analyzeExperience` 초입 분기) — e2e에서 `/api/analyze` 요청 0회 실측
- **명시 표시**: 상단 노란 스트립 "샘플 체험 중 — 실제 분석이 아니에요"(+실제 분석으로 전환 버튼, role=status), 분석 notice "샘플 체험 중이에요…", 기존 "Solar 샘플 데모" 배지·푸터 병행 — 실분석과 3중 구분
- **draft 불간섭**: 샘플 모드는 draft를 읽지도 쓰지도 않음(`keepStoredDraft` 옵션·저장 effect 가드) — 사용자의 실제 작성물 보존, 나가기 시 draft 복원
- **문구 규칙 적용**: 샘플 초기화 = "체험 처음부터 시작하기", 나가기 = "체험 나가기"(Voice&Tone 파괴적 작업 명명), 샘플 모드에서는 "기록 삭제" 숨김(사용자 작성물 없음)
- 홈 fine-print 갱신: "샘플은 코드 없이 볼 수 있어요 · 실제 분석은 심사·멘토링용 데모 코드로 입장해요"

## 검증

- e2e `tests/e2e/sample-verify.cjs` **10/10 + analyzeCalls 0** (`docs/evidence/issue-37/`): URL 진입 무게이트, 스트립, 여정 완주(STEP4), 샘플 notice·배지, 초기화 라벨, draft 무오염, 나가기→게이트, 게이트 버튼 재진입
- `npm test` 21/21 · lint 레거시 4 외 0(tests/e2e는 하네스 스크립트라 lint 제외 목록에 추가) · tsc 레거시 2 외 0 · diff-check OK

## 알려진 한계

- 샘플 fixture는 기존 기본 예시 기반 — Gate 3에서 비정형 장문 샘플 3종으로 교체 예정
