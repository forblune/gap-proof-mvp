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

## Skills 적용 기록 (구현 완료 후 감사 패스)

- **copywriting** 스킬 가이드(명확성>재치, 구체성, 과대약속 금지)로 STEP3 카피 전체(킥커·헤드라인·인트로·카드 문구·버튼 라벨) 재검토 → 이미 "(예상)" 헤지, 정직한 톤, 기존 앱 버튼 명명 규칙("다음: OO 보기 →")과 일관된 상태를 확인. **수정 없음.**
- **ui-ux-pro-max** 스킬 체크리스트(터치 타깃 44px, 포커스 링, 아이콘 일관성, 시맨틱 색상 토큰, 320px 가로 스크롤 0)로 최종 점검 → `.lookinto-link` min-height 44px, 전역 `:focus-visible` 규칙 그대로 적용, `fact-icons.tsx` 기존 SVG 아이콘 재사용(이모지 없음), 신규 raw hex 없이 기존 CSS 커스텀 프로퍼티만 사용, 기존 720px 브레이크포인트 재사용을 확인. **수정 없음** — Playwright 320~1440px 전 구간 통과와 독립 재평가로 이미 실증됨.
- **seo-audit**: 이 변경은 인증된 데모 흐름 내부 단계 추가로 신규 색인 가능 URL·메타데이터 변경이 없어 스킵(요구사항: "SEO 변경이 실제로 필요한 경우에만").
- **product-marketing**: `.agents/product-marketing.md` 컨텍스트를 팀원(Growth Hacker) 리뷰 프롬프트에 반영해 포지셔닝·신뢰 리스크 검토에 활용(별도 신규 산출물 없음, 기존 컨텍스트 재사용).
- Superpowers 절차: 명시적 `Skill()` 호출 대신, 팀 리드 승인 설계를 계획 문서로 삼고(writing-plans 취지) → 실패마다 근본 원인 진단 후 정밀 수정(systematic-debugging 취지: draft.test.mjs 경계값 오류, aria-label 문구 불일치) → 유닛 테스트를 구현과 함께 작성·즉시 실행(test-driven-development 취지)하는 절차를 따름.

## 최종 완료 조건 점검

- ✅ npm test 44/44 (exit 0) · ✅ npm run build(테스트에 포함) · ✅ npm run lint 신규 오류 0
- ✅ Playwright 159/159 — Chromium·WebKit·Firefox 전부 PASS
- ✅ 320/360/375/390/430/768/1440px 가로스크롤·겹침·클리핑 0(신규 e2e로 검증)
- ✅ 키보드·스크린리더 접근 가능 이름 확인(axe 0 + 독립 재평가)
- ✅ 외부 링크 전부 https, target=_blank는 rel="noopener noreferrer"
- ✅ 샘플 모드 Solar 호출 0 / 외부 API 실제 호출 0(네트워크 캡처로 검증) / Supabase 읽기·쓰기 0
- ✅ 새 브랜치 feat/learn-before-check-resources, main 직접 커밋·병합·배포 없음
- ✅ PR #76 (main 대상, draft, 미병합) 오픈 — https://github.com/forblune/gap-proof-mvp/pull/76

**목표 완료.**

---

## PR #76 독립 리뷰 후속 — 역할(role) 개인화 버그 수정

- 목표: PR #76의 개인화 오류(목표직무 선택 전에 기본 role 기준 자료 노출)를 수정하고 검증된 draft PR 상태로 만든다. 최대 10턴/3시간, 새 PR·main 병합·배포 없이 기존 브랜치/PR만 사용.
- 시작 상태 복원 확인: `pwd`=worktree, `git status`=clean, 브랜치=`feat/learn-before-check-resources`, HEAD=`8213877`(직전 세션 마지막 커밋), `origin/main`=`fcc5be1`, PR #76 = OPEN·DRAFT·MERGEABLE. 예상과 실제 일치, 다른 사용자 변경 없음.

### 근본 원인 (OBSERVE)

`app/demo/page.tsx`에서 `roleId`가 `useState(ROLES[0].id)`로 기본 초기화되고, 유일한 역할 선택 UI(`.role-select` 버튼 그룹)는 STEP4("목표직무 비교")에만 존재했다. STEP3 "먼저 알아보기"는 STEP2보다 나중, STEP4보다 먼저 등장하므로, 사용자가 목표직무를 한 번도 확인하지 않은 채 기본값(AI 서비스 기획자) 기준 검색어·미니프로젝트를 보게 되는 구조적 결함이었다. `role`/`gaps`/`recommended`/`lookIntoResources`는 이미 `roleId` 하나의 useMemo 체인에서 파생되므로(단일 소스 자체는 건재), 버그는 "언제·어디서 그 상태를 사용자가 볼 수 있는가"의 문제였다.

### 재현 테스트 (FAILING TEST)

`tests/e2e/role-personalization.spec.ts` 신규 작성 — 구현 전 실행 시 `getByText("이번에 알아볼 목표직무")` 요소가 없어 실패함을 확인(RED) → 구현 후 재실행하여 GREEN 전환(TDD).

### 팀 구성 및 독립 검토

| 역할 | 에이전트 | 의견 요약 |
|---|---|---|
| 리드 | Product Manager | APPROVE(조건부): STEP3/STEP4 중복 헤딩 금지, 두 인스턴스 모두 `setQuiz(null)` 필수, **AI 가설 폴백(`role.label` 대체 문구)을 실제 가설처럼 보여주지 말 것** — 실제 코드에서 `hypothesisBadge`/`buildProjectCard` 두 지점 모두에 폴백이 있었음을 직접 찾아 지적 |
| UX Researcher | UX Researcher | AI 가설(비활성 텍스트, STEP2 어투 재사용) → 연결 문장 → 픽커 순으로 배치 권고. 뒤로가기 시 불일치 알림은 "필수 아님, 있으면 좋음"으로 강등 |
| Engineering | Code Reviewer(1차: `engineering-code-reviewer` 존재하지 않아 재호출) | 단일 소스 확인, draft.ts `roleId` 스키마 이미 정상 확인, **기존 코드베이스에 이미 있는 모델 선택 다이얼로그의 `role="radiogroup"`+`<input type="radio">` 패턴 재사용을 위한 CSS(`.model-card`) 제시**, 재현 테스트의 버튼 쿼리를 radio로 바꿔야 함을 사전 지적 |
| Accessibility Auditor | Accessibility Auditor | **`role="group"`+버튼+`aria-pressed`안(내 최초안)을 기각** — "3개 중 1개 선택" 의미는 `radiogroup`+`radio`+`aria-checked`만 안정적으로 전달된다고 지적, 포커스 이동(STEP5 `proofHeadingRef`와 동일 패턴을 STEP3에도) 권고 |

리드 승인 최종안: (1) `RoleSelect` 공유 컴포넌트, `role="radiogroup"`+실제 `<input type="radio">`(기존 `.model-card` 패턴 재사용), (2) STEP3 최상단에 배치, AI 가설은 실제 값이 있을 때만 표시, (3) 두 인스턴스 모두 `setQuiz(null)`, (4) `resources.ts`의 hypothesis를 `string | null`로 바꿔 폴백 제거, (5) STEP3 진입 시 `<h1>` 포커스 이동.

### 구현 (단일 코드 수정자: 본 세션)

- `app/lib/resources.ts`: `ResourceCard.hypothesis`/`ProjectCard` 관련 필드 `string | null`. `hypothesisBadge()`는 hypothesis가 없으면 `null` 반환(폴백 문구 생성 안 함). 배지 문구를 `"AI 가설: {값} (판정 아님)"`으로 명확화.
- `app/demo/page.tsx`: 공유 `RoleSelect` 컴포넌트 신규(`role="radiogroup"`, `<label className="role-card">`로 실제 `<input type="radio">` 감싸기, `.model-card`와 동일한 시각적 숨김+포커스 링 기법). STEP3 최상단에 "이번에 알아볼 목표직무" 섹션 삽입(AI 가설 존재 시에만 안내 문구 표시 → 연결 문장 → RoleSelect). STEP4의 기존 `role="group"`+버튼 블록을 동일한 `RoleSelect`로 교체(두 인스턴스 모두 `setQuiz(null)` 유지). `lookIntoHypothesis` useMemo가 `string | null` 반환(폴백 제거). `lookIntoHeadingRef` 신규 + STEP3 도착 시 포커스 이동 useEffect(기존 `proofHeadingRef` 패턴과 동일).
- `app/globals.css`: `.role-select button` 규칙을 `.role-card`(라디오 은닉+`:has(input:focus-visible)` 포커스 링, `.model-card`와 동일 기법)로 교체. `.role-picker .role-select` 마진 오버라이드 추가(STEP4용으로 튜닝된 음수 마진이 STEP3의 다른 형제 요소와 우연한 마진 상쇄를 만들지 않도록).
- `tests/resources.test.mjs`: hypothesis가 `null`일 때 배지를 만들지 않는다는 테스트, hypothesis가 있을 때 "(판정 아님)" 문구 포함 테스트 추가.
- `tests/e2e/role-personalization.spec.ts`: 재현 테스트 4종(자료보다 먼저 픽커 노출, 직무 변경 시 즉시 갱신, AI 가설과 선택 직무 문구 분리, STEP3→STEP4→뒤로가기→재선택까지 전체 라운드트립에서 stale 데이터 0).

### 테스트 결과

- `npm test` → **46/46 통과**(신규 null-hypothesis 유닛 테스트 2종 포함, build 포함).
- `npm run lint` → 신규 오류 0(기존 4건은 이전 세션에 이미 확인한 main의 무관 사전 오류, 이번 변경으로 늘지 않음).
- `npx playwright test`(chromium+firefox+webkit 전체) → **171/171 통과**. `role-personalization.spec.ts` 12개(3브라우저×4시나리오) 전부 포함 — 자료보다 먼저 픽커 노출, 직무 변경 즉시 갱신(데이터 분석가 선택 시 AI 서비스 기획자 역량명 혼입 0), AI 가설·선택 직무 문구 분리, STEP3↔STEP4 왕복+재선택 후 이전 직무 잔존 자료 0. 기존 320~1440px/axe/외부 API 0 검증도 회귀 없이 통과.
- 샘플 모드 STEP1 첫 클레임(`SAMPLE_JOURNEY.claims[0]`)에 실제 `jobHypotheses`가 있어 "AI 가설" 표시 케이스가 실제로 검증됨(가짜 데이터 아님).

### 독립 재평가 (구현 완료 후, 코드 수정 미참여 팀원)

- **Accessibility Auditor**: radiogroup/radio 구현이 설계와 정확히 일치(`checked`가 `roleId`에서 직접 파생되어 시각뿐 아니라 실제 상태 배타성 보장), 포커스 링·STEP3 진입 포커스 이동 모두 기존 STEP5 패턴과 일관. 새로 발견한 사항: STEP4에서는 `RoleSelect` 위에 STEP3와 같은 눈에 보이는 "이번에 알아볼 목표직무" 라벨이 없어 마우스 사용자에게 "바꿀 수 있다"는 시각적 단서가 약함(WCAG 위반은 아님, 사소한 발견성 개선 여지). **판정: KEEP WITH MINOR NOTES.**
- **Code Reviewer**: 두 `RoleSelect` 호출부 모두 `setQuiz(null)` 확인, `lookIntoHypothesis`가 실제로 `string | null`이며 폴백 없음을 코드에서 직접 확인(46/46 유닛 테스트 실행으로 재검증), `role`/`roleId` 단일 소스가 STEP4·STEP5에서 변경 없이 그대로 유지됨을 확인, `role-personalization.spec.ts`를 직접 실행해 통과 재확인. **판정: KEEP.**

**결정: KEEP.** NEEDS REWORK 0건. STEP4 라벨 발견성은 정정 루프 없이 아래 "남은 문제"로 기록(정합성·접근성 하드 요건과 무관한 사소한 개선이라 이번 수정 범위에서 마무리).

### 남은 문제 (P1, 이번 PR 범위 아님 — 코드 미수정)

1. **STEP4 역할 선택기 시각적 라벨 부재**: STEP3에는 "이번에 알아볼 목표직무" card-kicker가 있지만 STEP4의 동일 `RoleSelect`에는 없어 발견성이 약함. 후속 PR에서 STEP4에도 동일 라벨(또는 "직무 다시 선택" 요약) 추가 권장.
2. **학습확인 퀴즈가 2문항 통과만으로 Lv.2 "수행 확인"을 부여하는 문제**(이번 목표에서 명시적으로 범위 제외): 퀴즈 통과=이해 확인, 실제 작업물·미니프로젝트=수행 확인으로 증거등급 의미를 재검토할 필요가 있음. 새 GitHub Issue는 생성하지 않음 — 별도 제안 시 이 항목을 근거로 사용.

### Git / PR

- 브랜치: `feat/learn-before-check-resources`(기존 유지) · PR #76(기존 유지, main 대상, **Draft·미병합** 상태 유지).
- 새 PR 생성 없음, main 직접 커밋 없음, force-push/reset --hard/브랜치 삭제 없음, 운영 배포·Cloudflare·Supabase·Secret 변경 없음.
- 커밋: `fix: align learn-before-check resources with selected role`(`b2cd423`), `docs: record independent PR review and remediation`(본 항목, `b2cd423`에 포함).

---

## PR #76 병합 전 최종 검증 (Ready for review 게이트)

- 목표: PR #76을 병합 전 최종 검증하고, 문제가 없으면 Draft→Ready for review 전환. main 병합·운영 배포는 하지 않음. 최대 6턴/3시간.
- 시작 상태 복원 확인: `pwd`=worktree, `git status`=clean, 브랜치=`feat/learn-before-check-resources`, HEAD=`b2cd423`(목표에서 예상한 SHA와 일치), `origin/main`=`fcc5be1`, PR #76=OPEN·DRAFT·MERGEABLE. 예상과 실제 일치, 다른 사용자 변경 없음.

### 필수 검증 1 — draft 새로고침 복원 E2E (일반 모드)

이 테스트 환경에는 유효한 `GATE_ACCESS_CODE`(시크릿)가 설정돼 있지 않아 실제 게이트 로그인을 거칠 수 없음을 확인(`.dev.vars` 부재, 기존 `gate.spec.ts`도 성공 로그인 케이스를 다루지 않음). 목표 지시("안전한 브라우저 localStorage fixture 사용, 실제 draft 계약 그대로 검증")에 따라: `page.route("**/api/gate", ...)`로 로컬 게이트 확인 엔드포인트의 GET 응답만 `{authorized:true}`로 모킹(Solar·Supabase와 무관한 순수 클라이언트 인증 체크, 실제로 호출하지도 않음)하고, `page.addInitScript`로 `DraftV1` 스키마와 정확히 일치하는 fixture(`roleId:"data_analyst"`, `step:3`, 확인된 claim 1개)를 `localStorage`에 심은 뒤 `/demo`(비-샘플)로 진입 → 실제 `page.reload()`까지 수행. `tests/e2e/pre-merge-verification.spec.ts` 신규 작성.

결과: STEP3 "먼저 알아보기"로 정상 복원, 데이터 분석가 라디오 선택 상태·역량("데이터 수집·정제") 확인, AI 서비스 기획자 전용 자료("문제 정의·도메인 연결") 혼입 0. 새로고침 후에도 유지. STEP4의 `.role-chip`, STEP5 결과 카드 모두 "데이터 분석가" 기준으로 일관. Engineering Code Reviewer가 fixture를 `parseDraft` 로직과 필드 단위로 대조해 "복원 실패 시 조용히 기본값(AI 서비스 기획자)으로 빠져 테스트가 잘못된 이유로 통과하는" 가능성까지 배제했음을 확인(우연한 통과 아님).

### 필수 검증 2 — 시각·UX

- 320/375/430/768/1440px에서 STEP3·STEP4 모두 가로 스크롤 0(신규 테스트, 접힌 "제도 확인하기" 콘텐츠 펼친 상태 포함).
- 키보드(`ArrowRight`)만으로 라디오 선택·포커스 이동 확인 — Accessibility Auditor가 코드 전체에서 `onKeyDown`/`ArrowRight` 핸들러가 RoleSelect에 전혀 없음을 grep으로 확인해 "네이티브 브라우저 라디오그룹 동작을 그대로 검증한 것"임을 재확인(가짜 통과 아님).
- STEP3 진입 시 `<h1>` 포커스 이동 확인(`toBeFocused()`).
- STEP3→4→3 왕복 후 선택 유지, 재선택 시 이전 직무 잔존 자료 0 — 직전 루프의 `role-personalization.spec.ts`가 이미 커버.
- STEP4 라디오 위 시각적 라벨 부재(기존 P1)는 UX Researcher가 "바로 옆 `.role-chip`이 현재 선택 직무를 이미 표시하고 있어 이해 실패는 아니며, 사소한 발견성 개선 여지 — 병합 차단 사유 아님"으로 재확인. 이번 PR에서 수정하지 않음(취향 수준 판단, devlog 유지).

### 필수 검증 3 — 링크와 개인정보

기존 `tests/resources.test.mjs`(YouTube·K-MOOC URL이 선택 직무의 우선 역량 키워드만 포함, 고용24·온통청년은 고정 공식 URL, `experience`/`quote` 미참조)와 `tests/e2e/learn-before-check.spec.ts`(https·`target=_blank`+`rel="noopener noreferrer"`·외부 API 요청 0 네트워크 캡처 검증)로 이미 전부 커버됨을 재확인 — 신규 코드 추가 없음(회귀 없음, `lookIntoComp.label`이 역할 변경과 무관하게 항상 카탈로그 문자열만 사용).

### 전체 테스트 결과

- `npm test` → **46/46 통과**(build 포함).
- `npm run lint` → 신규 오류 0(기존 4건 main 사전 오류, 무관).
- `npx playwright test`(chromium+firefox+webkit) → **183/183 통과**(신규 `pre-merge-verification.spec.ts` 12개 포함).
- 일회성 하이드레이션 콘솔 경고(`ThemeToggle`의 `disabled` 속성, webServer 로그)가 1회 관측됐으나, 해당 테스트를 3회 격리 반복 실행(`--repeat-each=3`)해도 재현되지 않았고, 재실행한 전체 스위트(183/183)에서도 재현되지 않음. `ThemeToggle`/`layout.tsx`는 이번 세션에서 전혀 수정하지 않은 파일이며, dev 서버(HMR) 특유의 비결정적 타이밍으로 판단 — 조용히 넘기지 않고 여기 기록함. 프로덕션 게이트인 `npm run build`는 별도로 매번 통과.
- Solar 실제 호출 0 / Supabase 읽기·쓰기 0 — 변경 없음(코드에 Supabase 클라이언트 자체가 없음, Solar는 `/api/analyze` 사용자 클릭 경로에만 연결되어 있고 이번 신규 테스트 어디에서도 트리거되지 않음, Engineering 재확인).

### 독립 리뷰 (4명 병렬, 최종 병합 게이트)

| 역할 | 판정 | 핵심 근거 |
|---|---|---|
| Product Manager(리드) | **KEEP** | 의사결정 이력 일관, 신규 테스트가 실제 격차를 메움(대충 통과하는 테스트 아님), Ready for review 승인 |
| UX Researcher | **KEEP WITH MINOR NOTES** | STEP4 라벨 부재는 `.role-chip`이 상쇄해 병합 차단 아님, STEP3 픽커가 게이트처럼 느껴지지 않음("건너뛰어도 됩니다" 등 문구가 이미 마찰 방지), STEP3 "이번에 알아볼 목표직무" vs STEP4 "대표 목표직무" 표현 차이는 사소한 후속 카피 정리 여지로만 기록 |
| Accessibility Auditor | **KEEP WITH MINOR NOTES** | radiogroup이 순수 네이티브 동작(커스텀 키보드 핸들러 0건 확인)임을 코드로 실증, 포커스 테스트는 필요하나 스크린리더 실기 확인은 인간 리뷰어 몫으로 남김(자동화 한계 인정) |
| Code Reviewer(엔지니어링) | **KEEP** | draft fixture가 `parseDraft` 전체 검증 로직을 통과함을 필드 단위로 추적 확인, `/api/gate` 모킹이 Solar·Supabase를 우회·은폐하지 않음을 코드 경로로 확인, git 상태 정합 확인 |

**NEEDS REWORK 0건. 최종 결정: KEEP — Ready for review 전환 승인.**

### 최종 merge gate 판단

모든 완료 조건 충족(draft reload E2E PASS, STEP3·4·5 role 일관성 PASS, 시각 검증 PASS, 개인정보 외부 전달 0, 전체 테스트 PASS, 독립 리뷰 NEEDS REWORK 0). PR #76을 **Draft → Ready for review**로 전환. main 병합·운영 배포는 수행하지 않음(사람 검토 대기).

### 남은 P1 (변경 없음, 코드 미수정)

1. STEP4 역할 선택기 시각적 라벨 부재 — 이번 루프에서 "사소함" 재확인, 병합 차단 아님.
2. 학습확인 퀴즈 2문항 통과=Lv.2 수행 확인 부여 로직 재검토 필요(이전 기록 유지, 이슈 미생성).
3. (신규, 비차단) `tests/e2e/pre-merge-verification.spec.ts`의 STEP5 도달 구간에서 `/api/share-config`(카카오 SDK) 호출이 모킹되지 않음 — try/catch로 무해하게 무시되지만 완전한 네트워크 격리를 원하면 후속에서 모킹 권장.

---

## PR #76 Squash Merge & 운영 배포

- 목표: PR #76을 안전하게 squash merge하고 GapProof 운영(https://gapproof.forblune.com)에 배포한 뒤 프로덕션 검증까지 완료. 실패 시 즉시 이전 Worker 버전으로 롤백. 최대 8턴/2시간.
- 시작 상태 복원 확인: `pwd`=worktree, `git status`=clean, HEAD=`d1e0691`(예상 SHA와 정확히 일치), `origin/main`=`fcc5be1`(예상과 일치), PR #76=OPEN·Ready for review·MERGEABLE·mergeStateStatus=CLEAN. Cloudflare 계정 인증 확인(운영 계정과 일치). 운영 URL `/` 사전 확인 200. 예상과 다른 점 없음, 다른 사용자 변경 없음 — 진행.

### 병합 전 최종 게이트

`npm test`(46/46) · `npm run lint`(신규 오류 0, 기존 4건 main 사전 오류와 구분) 재확인. `npx playwright test`(183/183, Chromium·Firefox·WebKit)는 직전 루프(같은 HEAD `d1e0691`)에서 이미 완전히 검증되어 코드 변경이 전혀 없는 상태이므로 8턴 예산 안에서 중복 재실행하지 않고 그 결과를 그대로 인용함(투명하게 기록).

### Squash Merge

`gh pr merge 76 --squash --delete-branch=false`(브랜치 보존, force-push·다른 PR 병합 없음). 병합 직전 PR head SHA(`d1e0691...`)를 재조회해 예상과 일치함을 재확인한 뒤 실행.

- **squash merge commit SHA**: `98f9f9b59c62378caa88f12f9f39cc5f0e3df7dc`
- 로컬 `main`(원본 체크아웃 `/Users/gh/gap-proof-mvp`, 이 워크트리와 별개) 상태 확인: clean, `fcc5be1`에서 뒤처짐 1커밋 → `git pull --ff-only origin main`으로 **fast-forward** 성공(reset 불필요, 로컬 변경 없었음) → 로컬 main HEAD = `98f9f9b`(merge commit과 일치), `git status` clean.

### 배포

기존 Runbook(`docs/deployment/GAPPROOF_RELEASE_RUNBOOK.md`) 절차 그대로 사용: `npm run build && npx vinext deploy`. Worker 이름·설정·binding·secret·DNS 변경 없음(4개 binding: ASSETS·IMAGES·ANALYZE_RATE_LIMITER·GATE_RATE_LIMITER, 배포 로그로 불변 확인).

- **배포 전 활성 Worker version(롤백 목표)**: `5e15cd88-18e1-4ac8-826f-c9eb900d554c`(2026-07-27T15:04 배포분)
- **배포 결과**: `npx vinext deploy`가 "Uploaded gapproof-mvp" 이후 workers.dev 서브도메인 미등록 관련 사후 체크에서 exit code 1을 반환(Runbook이 "무해"라 기록한 그 경고가, 현재 wrangler 4.92.0 버전에서는 non-interactive 환경에서 하드 에러로 승격됨 — 실제 업로드·바인딩 반영은 그 이전에 완료됨). `npx wrangler deployments list`와 운영 URL 실측 HTTP 200 응답으로 **실제 배포 성공을 직접 확인**(도구 종료 코드만으로 판단하지 않음). 진단을 위해 `vinext deploy`를 1회 더 실행(동일 커밋, 변경 없음)해 새 버전이 한 번 더 생성됨 — 무해하나 향후에는 exit code 대신 `deployments list`로 먼저 확인 후 재시도 여부를 결정할 것을 기록.
- **새(최종) 활성 Worker version**: `c18e56c4-4248-443d-8612-b1b3a925b8d4`(2026-07-27T21:37 배포분, 100%)
- Supabase migration·DDL·RLS·Auth·Edge Function 변경 0. Solar 실제 분석 호출 0(배포 절차 자체에 분석 호출 없음).

### 운영 스모크 테스트

`tests/e2e/production-smoke.spec.ts`(신규, 로컬에만 존재 — main에는 커밋하지 않음, 아래 참고)를 `PLAYWRIGHT_BASE_URL=https://gapproof.forblune.com`으로 실행(chromium). curl로 9개 페이지 HTTP 상태 우선 확인:

| 페이지 | 상태 |
|---|---|
| `/` `/demo?sample=1` `/about` `/guide` `/how-it-works` `/technology` `/privacy` `/terms` | 200 |
| `/contact` | **404 — 사전 존재하지 않는 라우트**(`npm run build` 라우트 목록에 애초에 없음, 이번 PR과 무관한 기존 상태. "핵심 페이지 5xx" 롤백 조건에 해당하지 않음) |

Playwright 16/16 통과:
- 정보 페이지 7종(`/about`·`/guide`·`/how-it-works`·`/technology`·`/privacy`·`/terms`·`/`) 200·console error 0·hydration error 0
- 320/375/430/1440px에서 `/`·`/demo` 가로 스크롤 0
- **STEP3 목표직무 선택기가 자료보다 먼저 노출**, 데이터 분석가 선택 시 역량·검색어 즉시 갱신(AI 서비스 기획자 전용 자료 혼입 0), **STEP4 role-chip·STEP5 결과까지 동일 직무 유지**
- **AI 가설과 선택 목표직무 문구 구분**(`AI 가설: ...` 표시 확인), 외부 링크(YouTube·K-MOOC·고용24·온통청년) 전부 `https`+`target="_blank"`+`rel="noopener noreferrer"`, YouTube 검색어에 사용자 원문("엑셀") 미포함·역량 키워드만 확인, 실제 외부 API 요청 0(youtube·kmooc·work24·youthcenter·upstage 요청 캡처 0건)
- **퀴즈 자동 시작 없음**(STEP3에 `.check-panel` 0개, STEP4 진입 직후 `.check-q` 0개) + 건너뛰기 가능(퀴즈 없이 GapProof 만들기 버튼 활성)
- STEP3 axe(wcag2a/aa) serious/critical 0
- 접근코드 게이트(오류 코드 처리)·샘플 모드 우회 기존 동작 회귀 0

### 최종 판단: KEEP — 롤백 불필요

롤백 조건(핵심 페이지 5xx·데모 진행 불가·STEP3·4·5 직무 불일치·hydration/런타임 오류·모바일 CTA 사용 불가·개인정보 외부 URL 노출·기존 기능 회귀) 전부 미해당. 운영 배포를 최종 상태로 확정.

### Git/PR 정리

- `production-smoke.spec.ts`는 이번 세션 검증 전용 스크립트로 **main에도, 이 브랜치에도 커밋하지 않음**("다른 기능 수정 금지" 범위를 넘지 않기 위함 — 이미 병합된 브랜치에 사후 커밋을 추가하는 것도 최소화). 로컬 main(`/Users/gh/gap-proof-mvp`)은 병합 커밋 `98f9f9b` 그대로 `git status` clean 유지.
- 이 devlog 갱신은 (이미 병합된) `feat/learn-before-check-resources` 브랜치에 커밋 후 push — main에는 직접 커밋하지 않음(표준 원칙 유지). 브랜치는 삭제하지 않음.
- force-push·다른 PR 병합·Secret/binding/DNS 변경·Supabase 변경 전혀 없음.

### 남은 P1 (변경 없음)

기존 두 항목(STEP4 라벨 부재, 퀴즈 Lv.2 로직 재검토) 유지. 신규: `npx vinext deploy`가 workers.dev 관련 사후 체크에서 exit 1을 반환하는 현상(실제 배포는 성공) — 다음 배포 시 exit code만으로 실패 판단하지 말고 `wrangler deployments list`로 직접 확인할 것.

