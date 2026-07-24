# Issue #3 — 프로젝트 기준 문서와 AI Reboot 적용 증거 정리

- Issue: https://github.com/forblune/gap-proof-mvp/issues/3
- 브랜치: `docs/3-project-baseline` (기준 커밋 `e78afa9`, `fix/1-mobile-header-progress`의 HEAD에서 분기)
- 작업일: 2026-07-24

## 문제와 목표

- 미추적 `docs/preview.md`(AI Reboot 학습 노트, 13,368줄)가 커밋 전 유실 위험 상태였고,
  제품 기준 문서 / 교육 원자료 / 실제 적용 증거의 역할 구분이 저장소에 없었다.
- 문서 커밋 2개(`4b31adf`, `e78afa9`)는 main에 없어 브랜치 유실 시 함께 사라질 수 있었다.
- 사용자가 승인·수행한 `.gitignore` 변경(`.dev.vars` 제외)을 보존해야 했다.

## Before 상태 (기준 커밋 `e78afa9`)

- `git status --short`: ` M .gitignore`, `?? docs/preview.md`
- `git log --oneline -3`: `e78afa9`, `4b31adf`(문서 커밋 2개), `d3c87ce`(main)
- `git check-ignore -v .dev.vars` → `.gitignore:45:.dev.vars` (사용자 변경 적용 상태)

## 주요 결정

1. **main이 아닌 현재 HEAD에서 분기** — 문서 커밋 2개를 PR에 포함해 main으로 보존(사용자 지시).
2. `preview.md`는 내용 무수정 이동만 수행(`docs/reference/AI_Reboot_학습노트.md`) — 원 파일명·출처는 적용표 머리말에 기록.
3. 적용표는 2026-07-24 읽기 전용 감사 결과만 근거로 작성 — 수업 자료 존재를 적용 증거로 승격하지 않음.
   Supabase·RLS는 "학습했으나 의도적 미사용 · Phase 2(#13)"로 명시.
4. 라이브 기준(`docs/evidence/live-baseline.md`)에 배포 차단 조건을 고정하고, 배포 버전 ID·라이브 캡처는
   [확인 필요 — 사용자] 항목으로 남김(로컬 세션은 라이브 접속을 하지 않음).
5. `.dev.vars`는 내용을 읽지 않았고, ignore 여부만 검증.

## 변경 파일

- 이동: `docs/preview.md` → `docs/reference/AI_Reboot_학습노트.md` (내용 무수정)
- 신규: `docs/evidence/AI_Reboot_GapProof_적용표.md`, `docs/evidence/live-baseline.md`,
  `docs/worklog/README.md`, `docs/worklog/issue-3-project-baseline.md`
- 수정: `docs/GapProof_인수인계_STATUS.md`(문서 인덱스 절 추가), `.gitignore`(사용자 승인 변경 보존)

## 검사 결과

- `git check-ignore -v .dev.vars` → `.gitignore:45:.dev.vars` **PASS** (Git 제외 확인, 내용 미열람)
- `git diff --check`(작업트리) → 출력 없음 **PASS**
- `git diff --cached --check` → 경고 1건: `AI_Reboot_학습노트.md:13368 new blank line at EOF` —
  원자료(구 preview.md)의 원본 그대로이며, 무수정 보존 원칙에 따라 수정하지 않고 기록만 남김
- 비밀값 패턴 스캔(sk-/up_/Bearer/AKIA/UPSTAGE_API_KEY=, 개수만 출력) → 전부 0 **PASS**
- `npm run lint` → 오류 없음 **PASS** (코드 파일 무변경 확인)
- `npm test` 미실행 — 문서 전용 변경이며 test는 전체 빌드를 요구(`package.json:12`)해 생략, 사유 기록

## After 상태

- 문서 3계층(기준/원자료/증거) 구분 완성, preview.md 유실 위험 해소(추적 시작)
- 배포 차단 조건이 저장소 문서(`live-baseline.md`)에도 고정됨

## 관련 커밋·PR

- 커밋: (커밋 후 기입 — PR 참조)
- PR: (생성 후 기입 — Closes #3)

## 알려진 제한사항

- 라이브 활성 배포 버전 ID·기준 화면 캡처는 사용자 확인 대기([확인 필요] 표시).
- STATUS 본문의 구식 서술(예: "git 4커밋") 정정은 이 이슈 범위 밖 — 인덱스 추가만 수행.
