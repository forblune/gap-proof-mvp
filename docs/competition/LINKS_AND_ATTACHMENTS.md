# GapProof 제출 링크·첨부파일 목록 (2026-07-28)

## 주요 링크

| 항목 | URL | 상태 |
|---|---|---|
| 운영 서비스 | https://gapproof.forblune.com/demo | `[운영 확인]` 2026-07-28 PR #78 배포 직후 스모크 테스트로 5개 페이지(`/`,`/demo?sample=1`,`/how-it-works`,`/technology`,`/about`) 전부 HTTP 200 확인 |
| GitHub | https://github.com/forblune/gap-proof-mvp | `[코드 검증]` 실제 존재하는 저장소 URL이지만 **현재 비공개(PRIVATE)** — 심사자가 접근하려면 제출 전 사람이 공개 전환하거나 심사 계정을 협업자로 초대해야 함. 이 사실을 숨기지 않고 그대로 기록한다 |
| Notion | (없음) | 커넥터 미연결로 생성하지 못함 — `docs/competition/REBOOT_AI_PRELIMINARY_MASTER.md`가 그대로 붙여넣기 가능한 대체 콘텐츠 |
| 시연 영상 | (없음) | 아직 촬영·제작하지 않음. `docs/competition/THREE_MINUTE_DEMO_SCRIPT.md`가 촬영용 대본 역할 |

## 첨부 파일

| 파일명 | 용도 | 생성 여부 |
|---|---|---|
| `GapProof_리부트AI활용대회_예선발표자료_1차.pdf` | 발표자료(16:9, 15슬라이드) — 문제·차별점·목표사용자·실제화면·기술스택·시스템구조·역할분리·트러블슈팅·품질검증·개인정보·현재/향후·활용계획 | ✅ 이번 세션에서 실제 생성(Mermaid → PNG, HTML → Playwright PDF 렌더링, 외부 디자인 툴 미사용) |
| `GapProof_기술구현및활용계획_1차.pdf` | 기술 상세 문서 | ❌ 미생성 — `docs/competition/REBOOT_AI_PRELIMINARY_MASTER.md`(마크다운)와 `docs/competition/SYSTEM_ARCHITECTURE.md`가 동일 내용을 담고 있으나, PDF 변환은 하지 않았다. 제출 전 사람이 마크다운→PDF 변환만 하면 되는 상태(추가 작성 불필요) |
| `GapProof_시스템구조.png` | 시스템 구조도(전체 구조 flowchart) | ✅ 이번 세션에서 `@mermaid-js/mermaid-cli`로 실제 렌더링(`npx`, 임시 사용 — package.json에 영구 설치하지 않음) |
| 주요 화면 캡처(`screenshots/` 4장) | home·demo-gate·demo-sample-start·about | ✅ 3장은 기존 Playwright 회귀 테스트 baseline, 1장(about)은 이번 세션 캡처. STEP2~5는 시간 제약으로 미캡처 |
| `06_주요화면목록.md` | 화면 캡처 색인 | ✅ 생성 |

## 정직한 메모

이 목록에 있는 모든 링크·파일은 실제로 존재한다. "존재하지만 접근 제한"(GitHub 비공개)과 "아예 존재하지 않음"(Notion·시연영상·기술문서 PDF)을 구분해 표기했으며, 어느 것도 완료됐다고 과장하지 않았다.
