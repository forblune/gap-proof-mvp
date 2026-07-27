# GapProof 세션 인수인계 — 2026-07-27

## 배포 결과

- **최종 main SHA**: `f5dbdbcc0b94cedf8fe2ab1da5768762021b1c28` (PR #74 squash merge)
- **최종 Worker version**: `5e15cd88-18e1-4ac8-826f-c9eb900d554c` (2026-07-27T15:04:25Z)
- **이전(rollback 대상) Worker version**: `9bafe089-e9d5-4848-8f35-0251d263d85d` (2026-07-26T08:46:33Z) — 문제 발생 시 `npx wrangler rollback 9bafe089-e9d5-4848-8f35-0251d263d85d` (정확한 rollback 명령은 배포 시점 wrangler 버전 문서 확인 권장)
- **병합된 PR**: [#74](https://github.com/forblune/gap-proof-mvp/pull/74) — design/professor-feedback-hybrid → main, squash merge
- **production URL**: https://gapproof.forblune.com/

## 완료된 교수 피드백 항목

- design-loop 01~09: 아이콘 도입, 타이포그래피 통일(Georgia 제거), 문체 통일(습니다체), 챕터 배경 그룹화 + 섹션 자동 번호, /demo STEP2 콘텐츠 밀도 완화(부분), 소형 텍스트 가독성 하한 상향, 표 가로 스크롤 제거 + 기술 로고 아이콘 — professor-review 57.4 → 75.6/100
- **STEP4 모바일 CTA 줄바꿈 수정**: `.final-actions .primary`를 `flex: 1 1 100%`로 변경, 320~430px 실측 완료(단일 행, 48px 터치 타깃, 1440px 회귀 없음), 운영 배포 후 재확인 완료
- **리터럴 HTML 엔티티 노출 수정**: `/technology`, `/how-it-works`의 `&ldquo;`/`&rdquo;`를 실제 curly quote로 교체, 운영 배포 후 재확인 완료(0건)

## 현재 제품 기능

- 5단계 데모 흐름(동의 → 경험 입력 → 역량 확인 → 격차/행동 → 개인 증거 카드), 샘플 모드(`?sample=1`)와 실제 Solar 연동 모드 분리
- 접근 게이트(서명된 HttpOnly 세션, fail-closed), 요청 한도, PII 마스킹, 모델 허용 목록, 무저장 원칙(서버에 원문 미저장)
- 다크/라이트 테마 토글, 모바일 드로어 내비게이션, `/demo` 헤더 액션 팝오버

## 테스트 결과 (커밋 `6baf011` / main SHA `f5dbdbc` 기준)

- `npm test`: 37/37 PASS
- `npm run build`: 성공
- `npm run lint`: app/ 신규 오류 0건(기존 4건 유지 — info-shell.tsx, page.tsx `<a>` 미사용 Link 2건, guide/page.tsx 미이스케이프 따옴표 2건)
- Playwright: chromium 38/38, firefox 38/38, webkit 38/38 → 114/114 PASS
- axe-core: serious/critical 위반 0건 (Playwright 접근성 스위트 포함)
- Lighthouse(로컬 프로덕션 빌드): `/` Perf 88 · A11y 100 · BP 96 · SEO 100 / `/demo` Perf 86 · A11y 100 · BP 96 · SEO 100 (기존 FINAL_AUDIT.md 기준선 대비 회귀 없음)
- 운영 스모크 테스트: `/`, `/demo`, `/technology`, `/how-it-works`, `/why`, `/who`, `/about`, `/privacy`, `/terms` 전부 200, 콘솔 오류 0, STEP4 CTA 정상(339px/48px, 줄바꿈 없음), 리터럴 엔티티 0, 모바일 드로어·데모 액션 팝오버 정상, 1440px 회귀 없음, 샘플 모드로 진행해 실제 Solar 호출 0
  - **주의**: 운영 스모크 테스트는 Chromium 엔진으로만 대화형 확인했습니다. WebKit·Firefox의 운영 환경 개별 확인은 하지 않았고, 대신 배포와 동일한 빌드 산출물에 대해 로컬에서 실행한 Playwright WebKit/Firefox 스위트(38/38씩 PASS)로 대체 검증했습니다. 브라우저별 운영 회귀가 우려되면 별도 확인 권장.

## 남은 P1 항목 (LOOP_LOG.md / FINAL_AUDIT.md 근거)

- `/demo` STEP2 콘텐츠 밀도 — 카드 1개당 7개 이상 하위 블록. design-loop-07에서 부분 완화했으나 미완료.
- `/how-it-works` 12단계 파이프라인 전체 나열 — 콘텐츠 밀도 최저점(5/10) 사유.
- 1440px 데스크톱 콘텐츠 폭 980px cap(좌우 여백 약 230px) — 권장 사항, 필수 아님, 3개 loop 연속 미해결.

## 남은 P2 항목 (MARKETING_SKILLS_REVIEW.md 근거)

- P1 5건, P2 10건 — 포지셔닝·카피·SEO 감사 결과 전체는 `docs/quality-loop/MARKETING_SKILLS_REVIEW.md` 참고.
- Lighthouse Best Practices 96/100 — `manifest.webmanifest` 절대경로 하드코딩으로 로컬 콘솔 CORS 오류(운영 도메인에서는 재현 안 됨, 이번 운영 스모크 테스트에서 `/` 콘솔 오류 0건으로 확인).
- Lighthouse Performance 84~90점 — 우수(90+) 경계.

## 보류한 항목 (사람 판단 필요, 이번 세션에서 의도적으로 손대지 않음)

- 홈 Hero 카피 개편
- ChatGPT 등과의 비교/차별화 문구 추가
- `/demo` STEP2 콘텐츠 재구조화(접기 등) — 핵심 액션 카피 기본 숨김 트레이드오프가 있어 design-loop-11/12에서 두 차례 되돌려짐, 사람의 우선순위 판단 필요

## Supabase / Phase 2

- **Supabase는 이번 세션에서 읽기·쓰기 모두 미착수입니다.** `/technology` 페이지에 명시된 대로, 상담사·기관 계정과 이력 저장이 필요해지는 Phase 2에서 도입을 검토합니다.

## 다음 세션 첫 작업 제안

1. `/demo` STEP2 콘텐츠 밀도와 980px 데스크톱 cap에 대한 사람의 우선순위 판단(완화할지, 유지할지)
2. MARKETING_SKILLS_REVIEW.md의 P1 5건 검토 및 착수 여부 결정
3. WebKit/Firefox 엔진으로 운영 도메인 개별 스모크 테스트(선택)

## 금지 영역 (이번 세션 지시 기준, 별도 승인 전까지 유지 권장)

- Supabase 읽기/쓰기
- 실제 Solar API 호출(테스트·데모는 샘플 모드로만)
- Cloudflare secret·binding 변경
- AI 평가 점수를 올리기 위한 임의 변경(내용의 정확성보다 점수 최적화 금지)

## git status (문서 작성 시점)

```
브랜치: docs/session-handoff-2026-07-27 (main SHA f5dbdbc에서 분기)
로컬 main: origin/main과 별도로 갈라진 상태 — 로컬 main에 origin에 없는 커밋 2개(cff58ec, f47252a) 존재,
           origin/main에는 로컬에 없던 이 PR의 병합 커미트 f5dbdbc 존재.
           로컬 main 브랜치 자체는 이번 세션에서 건드리지 않았음(detached HEAD로 f5dbdbc를 체크아웃해 빌드·배포).
           다음 세션에서 로컬 main을 origin/main과 어떻게 정리할지(rebase/merge) 확인 필요 — 이번 세션 범위 밖.
untracked: .agents/, .claude/skills/*, skills-lock.json — .git/info/exclude로 로컬 제외 처리(커밋 0)
```
