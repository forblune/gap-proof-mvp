# Learn Before Check Phase 1 — 개발일지

- 목표: GapProof "Learn Before Check Phase 1" — 자료(공식 검색 링크)를 먼저 보여주고 그 다음에만 선택적 이해 확인을 제공하는 흐름 추가
- 시작 기준: main HEAD `fcc5be125164a76eb336e63ffc690d00c242af0d`, working tree clean, 운영 배포 미변경
- 브랜치: `feat/learn-before-check-resources` (worktree `.claude/worktrees/feat-learn-before-check`, base main)
- 세션: 백그라운드 job, effort=ultracode, 턴 예산 12턴

## 팀 구성 (Agent Team)

설치된 Agency Agents(`~/.claude/agents/*.md`) 중 가장 가까운 역할을 선택함.

| 역할 | 에이전트 | 근거 | 권한 |
|---|---|---|---|
| 팀 리드 | Product Manager (`product-manager.md`) | 전체 로드맵/스코프 승인, 이해관계자 정렬 | 읽기 전용, 최종 설계 승인 |
| 팀원 A — Product Marketing 관점 | Growth Hacker (`marketing-growth-hacker.md`) | 설치된 에이전트 중 포지셔닝/전환/가치제안에 가장 근접 | 읽기 전용 |
| 팀원 B — UX·Copywriting 관점 | UX Researcher (`design-ux-researcher.md`) | 사용성/문구 톤 검토에 가장 근접, `copywriting`/`ui-ux-pro-max` 스킬 원칙 적용 지시 | 읽기 전용 |
| 팀원 C — QA·Accessibility·Reality Check 관점 | Accessibility Auditor (`testing-accessibility-auditor.md`) | WCAG 실측 + "증거 없으면 불합격" 태도가 QA/Reality Check 요구와 가장 근접 | 읽기 전용 |
| 실제 코드 수정자 | 본 세션(Claude Code, 오케스트레이터) | 단일 구현자로 지정 — 동일 파일 병렬 수정 방지 | 유일한 write 권한 |

## Loop 0 — 코드 수정 전 초기 감사 (OBSERVE)

Explore 서브에이전트로 조사한 결과:

1. **기존 흐름**: `app/demo/page.tsx` (단일 클라이언트 컴포넌트, 1182줄) — `step` state 0-4, `steps` 라벨 배열(`:69`). 기존 STEP1(경험, `:820-909`) = 스펙의 "1. 경험 증거". STEP2(역량확인, `:910-985`, 클레임별 `jobHypotheses`/`smallStep` 포함) = 스펙의 "2. 역량 후보와 직업 가설". STEP3(`:987-1077`, gap-map + action-grid + 인라인 퀴즈) = 스펙의 "4. 이번 주 학습 행동"(action-grid) + "6. 이해 확인"(퀴즈). "5. 작은 직업 실험"은 `app/lib/engine.ts`의 `project` ActionTemplate으로 이미 존재하나 독립 단계는 아님. **스펙의 "3. 먼저 알아보기"는 코드에 없음 — 이번 Phase 1의 핵심 신규 산출물.**
2. **데이터 모델**: `Claim`(`app/demo/page.tsx:21-42`), `JobHypothesis`(`app/lib/engine-v2.ts:16`), `Competency`/`Role`/`ActionTemplate`(`app/lib/engine.ts:8-26`), 영속화 `DraftV1`(`app/lib/draft.ts:13-41`, step 상한 `d.step > 4` at `:112`).
3. **기존 퀴즈**: 이미 자동시작 금지(명시적 버튼 클릭으로만 `startCheck()` 호출), 건너뛰기 가능(`closeCheck()`), 3회 실패 시 잠금 — 점수로 적성 판정은 하지 않음(패스/락 상태만 기록). 스펙 요구사항과 이미 합치.
4. **외부 링크 관례**: 리포지토리 전체에 `target="_blank"`/`rel="noopener noreferrer"` 사용 사례 0건 — 이번 기능이 최초 도입.
5. **테스트**: `npm test` = build + node --test 4개 파일. Playwright는 `npx playwright test` (스크립트 미등록, chromium/firefox/webkit 3-project). a11y는 `tests/e2e/accessibility.spec.ts`(axe-core, `/`, `/demo`, `/why`, `/how-it-works`, light/dark, serious/critical만 차단).
6. **Solar/Supabase**: Solar 호출은 `app/api/analyze/route.ts`에만 존재(서버 전용). Supabase 클라이언트 코드는 리포지토리에 전혀 없음(문서상 미사용 명시). 신규 컴포넌트는 이 둘을 import하지 않음.
7. **devlog 위치**: 리포지토리 관례는 `docs/worklog/issue-N-*.md`이나, 목표 지시에 따라 `docs/devlog/2026-07-28-learn-before-check.md` 신규 생성(본 파일).
8. **디자인 토큰**: `app/globals.css` CSS 커스텀 프로퍼티 + `.paper-card`/`.action-grid`/`.time-pill`/`.v2-badge`/`.v2-hypo` 등 재사용 가능 클래스 존재. 아이콘은 `app/components/fact-icons.tsx` 패턴 사용.

## Loop 1 — 설계 (진행 중)

전략(straw-man): STEP2와 기존 STEP3 사이에 신규 STEP3 "먼저 알아보기" 삽입, 기존 STEP3→4, STEP4→5로 재번호. `steps` 배열/progress grid/`draft.ts` step 상한 갱신. 경쟁력(competency) 키워드 기반으로 YouTube/K-MOOC/고용24/온통청년 "검색 링크"(실제 API 호출 없음, `encodeURIComponent`로 검색어만 구성) + 기존 `project` ActionTemplate 재사용한 "작은 프로젝트 1개" 카드 제공. 각 카드에 추천 이유/연결된 직업 가설/예상 시간/난이도/무료 여부/확인할 포인트 표기. 사용자 원문 경험 텍스트는 외부로 전달하지 않고, 앱 자체 카탈로그의 competency 키워드만 검색어로 사용.

### 팀원 독립 검토 결과 (병렬, 읽기 전용)

- **Growth Hacker(Product Marketing 관점)**: 4개 링크를 동등한 비중으로 나열하면 결정 마비·신뢰 저하 위험 → 의도별 그룹화(배워보기/제도 확인하기) 권고. "확인할 포인트"를 각주가 아니라 "추천 이유"와 동일한 시각적 비중으로 배치할 것을 강조.
- **UX Researcher(UX·Copywriting 관점)**: 검색 링크(자유 열람)와 프로젝트(단일 항목)를 같은 그리드에 섞으면 "하나만 골라야 하나"라는 오해 유발 → 그룹 분리 필요. 난이도·무료 여부 배지가 "확인된 사실"처럼 보이는 위험 지적 → 라벨에 "(예상)" 명시 요구.
- **Accessibility Auditor(QA·Accessibility·Reality Check 관점)**: **1차 판정 NEEDS REWORK** — 검색 링크 카드에 예상시간/난이도/무료여부를 원안 그대로 넣으면 "확인 안 된 콘텐츠 존재를 암시"하는 하드룰 위반 소지. 접근성 위험 3건(카드 간 링크명 구분 불가, 아이콘 전용 새창 표시, `<details>` 내 중첩 인터랙티브 요소) 지적.

### 리드(Product Manager) 승인 — 최종 설계

1. **레이아웃**: "먼저 검색해보기"(검색 링크 4개, `<details>`로 "배워보기"(YouTube·K-MOOC, 기본 펼침) / "제도 확인하기"(고용24·온통청년, 접힘) 분리) + "직접 해보기"(프로젝트 1개, 별도 섹션) — Growth·UX 두 제안을 하나의 위계로 통합.
2. **메타데이터 필드 정책(하드룰 충돌 해소)**: 예상시간/난이도/무료여부는 전부 "(예상)"을 라벨 자체에 명시하고 특정 콘텐츠가 아닌 플랫폼/검색 결과 유형의 일반적 특성으로 서술. "확인할 포인트"는 "추천 이유"와 동일한 `.follow-up` 클래스로 시각적 동급 배치.
3. **접근성 요구사항(바인딩)**: 카드별 고유 aria-label(플랫폼+역량명), "새 창에서 열림" 텍스트 안내, `<details><summary>` 내부에 중첩 인터랙티브 요소 없음.
4. **Phase 1 범위 제외(명시)**: 개인화 순위·A/B 노출 순서, 실시간 링크 유효성 검사, 다국어.

## Loop 1 — 구현·검증 (완료 · KEEP)

**참여 에이전트**: Product Manager(리드, 승인) · Growth Hacker(Product Marketing, 읽기 전용) · UX Researcher(UX·Copywriting, 읽기 전용) · Accessibility Auditor(QA·A11y·Reality Check, 읽기 전용 — 설계 검토 1회 + 구현 후 독립 재평가 1회) · 본 세션(Claude Code, 유일한 코드 수정자).

**근거(공식 검색 링크 실제 확인, WebFetch/WebSearch)**:
- YouTube: `https://www.youtube.com/results?search_query=<검색어>` — 공지된 안정적 검색 URL(별도 확인 불필요할 만큼 표준적).
- K-MOOC: `https://www.kmooc.kr` 실제 페이지 HTML에서 `/view/search/%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5`("인공지능" 인코딩) 링크를 직접 확인 → `/view/search/<검색어>` 패턴을 그대로 사용.
- 고용24(HRD-Net)·온통청년: WebFetch로 두 사이트 모두 확인한 결과 **GET 방식 키워드 딥링크를 정적 HTML에서 찾을 수 없음**(JS/POST 기반) → 검색어를 URL에 지어내지 않고, 공식 진입 페이지(`https://hrd.work24.go.kr/`, `https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch` — 둘 다 WebSearch로 실제 존재·정확한 명칭 확인됨)로 연결하고 검색어는 화면 문구(searchHint)로만 안내.

**변경 파일**:
- `app/lib/resources.ts`(신규) — 검색 링크·배지·문구를 만드는 순수 함수. React 비의존, 사용자 원문(`claim.quote`·경험 텍스트) 미사용(코드 내 주석·grep으로 확인).
- `app/demo/page.tsx` — 신규 STEP 3 "먼저 알아보기" 삽입(기존 STEP3→4, STEP4→5로 재번호), `steps` 배열·이동 버튼·포커스/카카오 effect의 step 상수 전부 갱신.
- `app/globals.css` — `.progress` 6열로 변경, `.lookinto-*` 신규 클래스(기존 `.paper-card`/`.action-grid`/`.v2-badge`/`.v2-hypo`/`.follow-up` 최대한 재사용).
- `app/lib/draft.ts` — draft step 상한 `>4` → `>5`.
- `tests/resources.test.mjs`(신규 7종), `tests/e2e/learn-before-check.spec.ts`(신규 6종), `tests/draft.test.mjs`(step 5는 이제 유효값이므로 out-of-range 픽스처를 6으로 수정), `tests/e2e/user-flow.spec.ts`(버튼 라벨 변경 반영), `tests/e2e/responsive.spec.ts`(뷰포트를 320/360/375/390/430/768/1440으로 교체).
- `package.json` — `npm test`에 `tests/resources.test.mjs` 편입.

**독립 재평가(Accessibility Auditor, 구현 완료 후)**: 실제 코드 재확인 결과 — (1) 시간/난이도/무료여부 문구는 전부 "예상" 표기로 특정 콘텐츠 존재를 단정하지 않음(하드룰 충족), (2) PII 검증: `buildLookIntoItResources` 호출부는 `role.competencies[].label`(고정 카탈로그 문자열)과 `claim.jobHypotheses[].title`(앱 생성 구조화 라벨)만 사용, `claim.quote`·경험 원문은 코드 어디에도 전달되지 않음(grep으로 확인), (3) 접근성 3개 조건 중 2개 완전 충족, 1개(고용24·온통청년 aria-label에 역량명 누락) 부분 충족 지적 → **즉시 수정**(aria-label에 역량명 추가). 최종 판정 **KEEP WITH MINOR NOTES**.

**테스트 결과**:
- `npm test` → 44/44 통과 (build 포함, 신규 `resources.test.mjs` 7종 포함).
- `npm run lint` → 4건(전부 main에 이미 존재하던 사전 오류, 본 변경 파일과 무관함을 `git stash` 대조로 확인) · **신규 오류 0**.
- `npx playwright test`(전체 스위트, chromium+firefox+webkit) → **159/159 통과**. 신규 `learn-before-check.spec.ts` 6종(자동시작 없음·건너뛰기 가능·외부링크 https+noopener noreferrer+새 창 안내·API 호출 0·320~1440px 7개 뷰포트 가로스크롤 0·axe serious/critical 0) 전부 포함.
- 샘플 모드 Solar 호출 0 / 외부 API(youtube·kmooc·work24·youthcenter) 실제 요청 0 — `page.on("request")` 캡처로 직접 검증.
- Supabase 읽기·쓰기 0 — 코드에 Supabase 클라이언트 자체가 없음(변경 없음, 기존 상태 유지).

**결과: KEEP.** 사유 — 팀 승인 설계대로 구현되었고, 하드룰(콘텐츠 존재 단정 금지·원문 미전달·퀴즈 비자동시작·건너뛰기 가능·API 미호출) 전부가 코드·테스트로 이중 확인됨. REVERT 사유 없음.

**다음 행동**: `git add`→커밋(의미 단위)→push→PR 오픈(main 대상, 미병합 유지) → 전체 검증 로그를 PR 본문에 링크.

