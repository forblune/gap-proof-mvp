# Issue #42 — Gate 6: AI 대화 정리 가져오기 + TXT/MD 첨부 Phase 1

- Issue: #42 · 브랜치 `feat/42-ai-import-file`(base rc `62e9fe3`) · 작업일 2026-07-25

## 구현

- **"이미 사용하는 AI가 있나요?"**(STEP1): ChatGPT·Claude·Gemini 공용 정리 프롬프트(사실 위주·부풀리기 금지·개인정보 제외·"(확인 필요)" 표기 규칙 내장) + 복사 버튼(성공/실패 알림) + **"외부 AI의 답은 확정된 사실이 아니라 초안" 라벨** + 붙여넣기 전 개인정보 확인 안내
- **파일 Phase 1**: TXT·MD·MARKDOWN 1개, 확장자+MIME 이중 검증(스푸핑 거부)·200KB 상한·빈 파일 거부 — `app/lib/import-file.ts` 순수 함수. **브라우저 내 텍스트 추출만**(서버 업로드·원본 저장 없음 명시), 미리보기(표시만 절단)→[제외]/[입력에 추가] 사용자 확인 후에만 반영, 기존 입력 뒤에 이어붙임(자동 절삭 없음 — 10,000자 초과 시 기존 경고 체계)
- PDF·DOCX는 "다음 단계 준비 중" 정직 표기

## 검증

- 신규 단위 4종(`tests/import-file.test.mjs`, npm test 편입 → **32/32**): 확장자/MIME/대소문자/빈 MIME, 스푸핑 거부, 용량·빈 파일, 미리보기 절단, 프롬프트 규칙 포함
- e2e `tests/e2e/import-verify.cjs` **9/9**(390px): 초안 라벨, 클립보드 실복사, pdf 거부 문구, 200KB 거부, 미리보기 표시, **자동 반영 아님 확인**, 추가 후 입력 반영 (`docs/evidence/issue-42/`)
- lint 레거시 4 외 0 · tsc 레거시 2 외 0 · diff OK

## 알려진 한계

- PDF·DOCX 파서는 RC 범위 외(Phase 2 후보) · 모바일 실기기 파일 선택 UI는 Gate 10 수동 항목
