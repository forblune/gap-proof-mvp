# Issue #46 — Gate 10: 크로스브라우저·접근성 QA (자동화 파트)

- Issue: #46 · 브랜치 `qa/46-rc-sweep`(base rc `a3cd72f`) · 작업일 2026-07-25

## 자동화 QA 결과 — 전 항목 PASS (`docs/evidence/issue-46/qa-sweep.json`)

- **자산**: favicon(svg/ico)·192/512/maskable·apple·og·manifest·robots·sitemap 10종 200
- **뷰포트**: 360/390/768/1024/1440 + 200% 확대 근사(720·320) × 4라우트(홈·/why·/demo·/privacy) — overflow 0
- **접근성**: 미명명 컨트롤 0(버튼·링크·입력 전수 검사), focus-visible 스타일 존재, reduced motion 스모크
- **키보드 전용**: Tab만으로 동의 체크→시작→분석→STEP2 도달(샘플·무마우스)
- **인쇄(#26)**: 실여정 STEP4에서 identity 잉크 반전·크롬 숨김 유지
- **console error 0**(로컬 manifest CORS·의도 401 아티팩트 제외 규칙 명시)
- **WebKit**: 홈 Hero·무코드 샘플 STEP2(후보 3) 재현
- 배터리: `npm test` 32/32 · lint 레거시 4 외 0 · tsc 레거시 2 외 0 · e2e 5스위트(직전 Gate 9에서 재통과)

## 수동 검증 체크리스트 (사용자 — RC 최종 판정 전제)

- [ ] iPhone Safari · Android Chrome · **카카오 인앱 브라우저** 전체 여정(무코드 샘플+데모 코드 실분석)
- [ ] 재인증·앱 전환 후 draft 복원 실기기 확인(#35)
- [ ] 화면 회전·모바일 키보드·파일 선택(TXT/MD)
- [ ] 실기기 인쇄 미리보기·PDF
- [ ] 스크린리더(VoiceOver) 여정 청취
- [ ] RC 운영 재배포(사용자 승인) 후 실제 Solar 1회로 V2 필드 충실도 확인
- [ ] 3분 시연 실발화 3회 완주

## 판정

**자동화 범위 PASS · 실기기/재배포 항목은 사용자 수동 대기** — P0 0 · 흐름 차단 0 · 알려진 치명 결함 0
