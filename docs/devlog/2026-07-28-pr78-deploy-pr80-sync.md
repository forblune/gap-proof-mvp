# PR #78 병합·배포 + PR #80 동기화 + 제출 패키지 확장 개발일지 (2026-07-28)

## 목표

PR #78을 squash merge하고 운영 배포·스모크 검증한 뒤, PR #80을 최신 main에 동기화하고 경쟁 문서 상태를 갱신해 Ready for review로 만든다. 세션 도중 대회 담당자로부터 추가 제출 요구사항(발표자료 PDF·GitHub·운영 링크 필수, 이메일 5항목 구조 등)이 전달되어 반영했다.

## PR #78 최종 게이트 (병합 전)

`perf/lighthouse-90` 브랜치를 주 체크아웃에서 checkout(HEAD `cde55cb627f687388ef327facc413dfb1d32af6b`, 예상과 일치).

- `npm run lint`: 최초 실행 시 1774개(45 errors)로 보였으나, 원인은 주 체크아웃 루트에서 `eslint .` 실행 시 내부에 중첩된 워크트리(`.claude/worktrees/feat-learn-before-check/`, 다른 브랜치)까지 재귀적으로 스캔됐기 때문 — `--ignore-pattern .claude` 추가 후 재실행하여 정확히 기존 4건(무관 파일)만 확인. **PR #78 코드 자체의 문제가 아니라 이 세션의 디렉터리 구조(워크트리가 주 체크아웃 내부에 중첩)로 인한 측정 오염이었다.**
- `npm test`: 46/46 통과(build 포함).
- `npx playwright test`(전체, 3브라우저): 189/189 통과(백그라운드 실행, 7.9분).
- Lighthouse(`wrangler dev` 기준, 4페이지): `/`=97, `/demo?sample=1`=59(1차, 이상치), `/how-it-works`=97, `/technology`=98. `/demo?sample=1`의 59점은 직전 189개 Playwright 3브라우저 테스트(약 8분)가 방금 끝난 직후 측정한 것이라 리소스 잔여 영향을 의심하고 3회 재측정 → 97, 94, 98(median 97) — 일회성 노이즈로 결론, 코드 회귀 아님. 이 프로젝트의 기존 원칙("한 번만 나온 점수로 판단 금지")을 그대로 적용한 사례.

## PR #78 병합·배포

- `gh pr merge 78 --squash` → merge SHA `38a8274ab11225f2763a93a54d7601f5158fd943`.
- 주 체크아웃 `git checkout main && git pull --ff-only origin main` → `38a8274`로 갱신.
- `npm run build && npx wrangler deploy`. 배포 로그에 `Uploaded gapproof-mvp (7.44 sec)` 직후 `workers.dev 서브도메인을 등록해야 합니다` 경고와 함께 **비대화형 컨텍스트에서 라우트 설정 관련 에러**가 출력됐다.
  - **배포 성공을 단정하지 않고 직접 재확인**: `npx wrangler deployments list` → 새 버전 `d8cf6a5a-cdc4-47f0-9c54-86394e07157c`가 100% 트래픽으로 실제 생성됨을 확인. `wrangler.jsonc`에 `routes`/`custom_domain` 필드가 없음을 grep으로 확인 — 이 프로젝트의 커스텀 도메인(`gapproof.forblune.com`)은 wrangler.jsonc가 아니라 Cloudflare 대시보드에서 별도 관리되는 것으로 판단되며, 에러 메시지는 (사용하지 않는) `workers.dev` 서브도메인 등록 여부에 대한 것이었다. **원인은 확정적으로 재현·검증하지 못했으나(대시보드 설정을 직접 열람할 도구가 없었음), 아래 스모크 테스트 결과가 실제 서비스 정상 반영을 뒷받침한다.**
  - 이전 버전: `c18e56c4-4248-443d-8612-b1b3a925b8d4`(롤백 대상으로 기록, 사용하지 않음 — 아래 스모크 전부 통과).
- 운영 스모크(`curl`, 2026-07-28): `/`, `/demo?sample=1`, `/how-it-works`, `/technology`, `/about` 전부 HTTP 200. `/demo`·`/demo?sample=1` 모두 `<link rel="canonical" href=".../demo">`로 정상(홈 자기참조 버그 아님, PR #78의 SEO 수정이 운영에 반영됨을 직접 확인).
- secret·binding·DNS·Supabase 변경 없음(배포 명령 자체가 코드 업로드만 수행, 별도 설정 변경 명령 실행하지 않음).

## PR #80 최신화

- `feat/competition-about` 브랜치(clean, 사용자 변경 없음 확인)에서 `git merge origin/main --no-edit` → PR #78이 반영된 main을 병합. **PR #78과 PR #80은 건드린 파일이 전혀 겹치지 않아(`app/globals.css`/`app/demo/layout.tsx`/`tests/e2e/accessibility.spec.ts` vs `app/about/page.tsx`/`tests/e2e/responsive.spec.ts`/`docs/competition/*`) 충돌 없이 병합됨.** rebase 대신 merge 사용(지시대로), force-push 없음.
- 새 HEAD: `256ad99c277efffc28c05465a19901b6747d8381`.

## 경쟁 문서 상태 갱신

`docs/competition/REBOOT_AI_PRELIMINARY_MASTER.md`, `TROUBLESHOOTING_CASES.md`에서 "PR #78 미병합" 관련 문구를 실제 병합·배포·운영 확인 사실로 교체(merge SHA, Worker 버전, 재측정 Lighthouse 수치, canonical 운영 확인). 증거등급 CONFLICT·STEP3/4 순서 CONFLICT·사용자 3명 검증·Canva 슬라이드 미생성·이메일 미발송은 전부 그대로 `[예정]`/`[가설]` 유지 — 사실이 바뀌지 않았으므로 건드리지 않았다.

## 세션 중 추가 지시 반영 (대회 담당자 공식 안내)

작업 도중 다음 공식 안내가 전달됨: 제출 양식 자유, 발표자료 PDF+GitHub+운영링크 필수 권장 병행 제출, 이메일 본문 5항목(서비스명/한줄소개/주요링크/기술스택/첨부파일) 구조 필수, Notion/시연영상/기술문서 추가 권장.

- **발표자료 PDF 실제 생성**: 외부 디자인 툴(Canva) 미연결 상태에서, 이미 이 저장소에 있는 도구만으로 생성했다 — `npx @mermaid-js/mermaid-cli`(일회성 `npx` 실행, `package.json`에 영구 설치하지 않음)로 시스템 구조 Mermaid를 PNG로 렌더링하고, 실제 화면 캡처 3장 + 이 PNG를 포함한 HTML 15슬라이드(16:9)를 작성한 뒤 `@playwright/test`의 `page.pdf()`(이미 이 저장소의 devDependency)로 PDF 변환. 파일명 규칙(`GapProof_리부트AI활용대회_예선발표자료_1차.pdf`)을 그대로 사용. 이 PDF는 본 세션 1인이 작성했으며 별도 리뷰팀 검증은 시간 제약으로 생략했다 — `SUBMISSION_PACKAGE_CHECKLIST.md`에 정직하게 기록.
- **GitHub 링크 접근성 확인**: `gh repo view`로 저장소가 **비공개(PRIVATE)** 임을 직접 확인. 링크 자체는 실재하지만 심사자가 접근하려면 사람이 공개 전환하거나 초대해야 한다는 사실을 숨기지 않고 이메일 초안·체크리스트·링크문서 전체에 명시.
- **이메일 초안 5항목 구조로 재작성**: 담당자가 제공한 정확한 한 줄 소개 문구를 그대로 사용. 존재하지 않는 링크(Notion·시연영상)는 "준비 중"으로 명시하고 절대 완료로 표시하지 않음.
- **신규 문서 3개**: `docs/competition/SUBMISSION_PACKAGE_CHECKLIST.md`(필수/선택 제출물 표), `docs/competition/LINKS_AND_ATTACHMENTS.md`(링크·첨부 목록).
- **다크모드 토글 발견(코드로 확인, 추측 아님)**: `app/globals.css:362`의 `.info-nav { display: none; }`(≤720px)로 모바일 헤더의 `ThemeToggle`이 완전히 숨겨짐(햄버거 드로어 안에는 중복 존재). 헤더는 전 페이지 공유 컴포넌트라 About PR에 안전하게 포함하기엔 범위가 크다고 판단 — **수정하지 않고** 마스터 문서 §11에 P1 항목 7번으로 정확한 파일·라인 근거와 함께 기록만 했다.

## Git/PR

- PR #78: squash merge, merge SHA `38a8274ab11225f2763a93a54d7601f5158fd943`.
- PR #80: `feat/competition-about`에 `origin/main` 병합(merge commit), 문서 갱신 커밋 추가 예정, 병합·배포 없음.
- main 직접 커밋 없음(PR #78은 GitHub API를 통한 squash merge), force-push/reset --hard/브랜치 삭제 없음, Supabase/DNS/secret 변경 없음, 실제 이메일 발송 없음.
