# Issue #12 — Phase B-1: 운영 배포 및 자동 검증

- Issue: https://github.com/forblune/gap-proof-mvp/issues/12 (OPEN 유지)
- 승인: 사용자 명시 배포 승인(Phase B-1) · 기준 main `19c8c48`
- 작업일: 2026-07-25 · 문서 브랜치: `qa/12-phase-b-production-validation`
- 결과 요약: **배포 성공 · 자동 검증 전 항목 통과 · 앱 결함 0건 · 롤백 불필요 · 실 Solar 호출 1회**

## 수행 내역 (순서)

1. **사전 확인**: main `19c8c48` clean, .dev.vars 무추적(미열람), wrangler 4.92.0 로그인(계정 확인), lint 레거시 4/tsc 레거시 2 외 신규 0, test 15/15, build 성공
2. **롤백 목표**: 배포 전 활성 버전 `9c0145d5-bc1a-4027-8a5c-98cbb2b2b081`(2026-07-23, 유실 소스 구버전) 기록
3. **시크릿**: GATE_ACCESS_CODE·GATE_SESSION_SECRET **사용자 직접 등록**, UPSTAGE_API_KEY 기존 유지(미열람). `secret list` 이름만 확인 — 필수 3종 충족, 금지 변수 없음
4. **배포**: `npx vinext deploy` 1회 → 버전 `cece759c-90c0-4788-99d6-6a8412cf59e1`(100%), 바인딩 4종 출력 확인, 다운타임 0. workers.dev는 계정 서브도메인 미등록으로 URL 없음(대시보드 변경 금지 범위 — 미등록 유지, smoke test는 운영 도메인)
5. **smoke test**: 14개 라우트 200 / 404 3종 기대값 / OG 1200×630 / 보안 헤더 5종 / 비인증 게이트만 노출
6. **게이트·쿠키**: 401·오답 처리·`HttpOnly; Secure; SameSite=Lax` 실측(값 마스킹), 잠금 후 쿠키 삭제 실증
7. **실 Solar 1회**(테스트 전용 가짜 PII 포함 입력): "Solar 실연결 · solar-pro3" 배지, 후보 3건·원문 일치 인용, **원문 PII 화면·로그 미노출**([이메일] 계열 마스킹 고지), 확인 0개 차단, 카드·Gap Brief·삭제·잠금 전부 정상, console error 0
8. **무과금 429**: 단일 연결에서 400×10 → **429+retry-after 60**(11·12회째), Solar 추가 호출 0. 신규 연결 분산 시 카운터가 엣지 서버 단위 근사라는 특성 발견·기록(브라우저 클라이언트에는 유효)
9. **UI·인쇄**: STEP4 5뷰포트 시각 검증 + /about 5뷰포트 수치 OK, 인쇄 #26 유지, PDF 1p(콘텐츠 분량에 따른 1~2p 범위)
10. **Worker 로그**(tail 526줄): PII 0 · 시크릿 0 · rate_limit_unavailable 0

상세·스크린샷 18점: `docs/evidence/issue-12/phase-b-production/` (`validation-report.md` 포함)

## 정직 기록

- 1차 검증 스크립트가 삭제 확정 버튼 라벨(실제 "삭제")을 잘못 짚어 중단 → **앱 결함 아님**, 무Solar 후속 스크립트로 완료. 그 여파로 STEP4 overflow 수치 소실 → 시각 검증+Phase A 수치로 갈음
- 게이트 limiter 부하 시도는 운영 방해 위험으로 이연(코드 경로는 Phase A 검증)
- PDF 1페이지: 확인 주장 1건 분량 기준 — 로컬 리허설(2p)과 차이는 콘텐츠 길이, 잘림·빈 페이지 없음

## 남은 항목 — 수동 실기기 검증 (사용자, Issue #12 종료 전)

- [ ] iPhone Safari: 게이트→4단계 여정, 공유 시트
- [ ] iPhone 홈 화면 추가 → A1 아이콘(180)
- [ ] Android Chrome: 여정 + 홈 화면/PWA 아이콘(192/512/maskable)
- [ ] **카카오톡 실제 링크 공유** 미리보기(신 OG — 구 캐시 시 카카오 공유 디버거로 초기화)
- [ ] 데스크톱 Safari: 여정 + **시스템 인쇄 미리보기 대화상자**
- [ ] 실제 프린터 또는 PDF 출력(#26 배경 OFF 가독)
- [ ] 브라우저 탭 favicon(밝음/어둠), 구 favicon 캐시 잔존 여부
- [ ] 화면 회전(모바일 가로↔세로)
- [ ] 터치 대상 44px·모바일 키보드 동작
- [ ] 3분 시연 발화 실측(리허설 대본은 Phase A 증거)

## 외부 플랫폼 후속(이번 배포 무변경 — external-followups.md)

카카오 앱 아이콘 A1 교체 / 비즈 앱·이메일 권한 재확인 / 네이버 로고 / (필요 시) Google OAuth 로고 / 채널 일관성. **카카오 프로필 사진 필수 동의 여부는 현재 배포 기능과 무관 — #11 구현 시 최소 수집 원칙으로 재검토**

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입) — 제목 "Phase B production validation", Closes #12 미사용
