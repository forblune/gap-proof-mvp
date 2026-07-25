# Phase B 실검증 매트릭스 (배포 후 실행 순서 · Phase B-0에서는 미실행)

실행 원칙: A→E 순서. 실패 항목 발견 시 심각도 판단 → 치명(접근 불가·보안)이면 즉시 롤백, 경미면 기록 후 계속.

## A. 기본 접근 (배포 직후 10분 내)

- [ ] `https://gapproof.forblune.com` 접속 + HTTPS 인증서 유효(자물쇠/발급자)
- [ ] `https://gapproof-mvp.<서브도메인>.workers.dev`도 동일 동작(기본 URL)
- [ ] www 등 다른 호스트: `www.forblune.com`·루트 도메인의 리다이렉트/무관 여부 확인(이 워커 대상 아님 — 현황만 기록)
- [ ] `GET /` 200 — 비인증은 **게이트 화면만**(데모 본문 미노출, SSR 기준)
- [ ] `/about` `/guide` `/how-it-works` `/technology` 200 (참고: `/privacy`·`/terms` 라우트는 현재 없음 — 4개 정보 페이지가 공개 IA 전부. 필요 시 후속 이슈)
- [ ] `/manifest.webmanifest` 200 · `/favicon.svg` `/favicon.ico` 200 · `/og.png` 200(1200×630)
- [ ] `/robots.txt` `/sitemap.xml` 200
- [ ] 존재하지 않는 경로(`/no-such-page`) → 404 계열 명시 처리(빈 200 아님)
- [ ] 보안 헤더 5종(curl -D): nosniff / X-Frame-Options DENY / Referrer-Policy / Permissions-Policy / CSP frame-ancestors

## B. 브랜드 (A1 최종 자산)

- [ ] 헤더 로고가 최종 A1 인라인 SVG(게이트 카드·메인 헤더·증거카드·정보 페이지)
- [ ] 실제 브라우저 탭 favicon(데스크톱 Chrome 밝음/어둠 테마)
- [ ] iPhone 홈 화면 추가 → apple-touch-icon 180 표시
- [ ] Android 홈 화면/설치 → 192/512, maskable 적용 확인
- [ ] OG 1200×630: 트위터/카카오 디버거에서 최종 이미지 로드
- [ ] **카카오톡 실제 링크 공유** 미리보기(제목·설명·이미지) + 1:1 크롭에서 브랜드 요소 유지
- [ ] 모바일 메신저(카카오 외 1종) 크롭 확인
- [ ] 이전 OG·favicon **캐시 잔존** 확인 → 카카오 공유 디버거 캐시 초기화, 브라우저 강력 새로고침

## C. 실제 분석 (Solar 실호출은 승인된 1회)

- [ ] 비인증 `/api/analyze` → 401 JSON(서버 게이트)
- [ ] 잘못된 접근 코드 → 실패 + 연속 시도 시 429
- [ ] 올바른 코드 → 세션 발급, **Secure; HttpOnly; SameSite=Lax** 쿠키(개발자도구 확인)
- [ ] **실제 Solar 1회 호출**: 배지 "Solar 실연결 · <모델>" (샘플 배지와 명시 구분)
- [ ] 근거 인용이 입력 원문 문장과 정확 일치(마스킹 규칙 포함)
- [ ] 주장 확인·수정·제외 동작 / 확인 0개면 다음 단계 차단
- [ ] 결과 카드·Gap Brief 정상(날짜·목표 직무·Lv 표기)
- [ ] 기록 삭제 → 확인 바(취소/확정/Escape) → 확정 시 초기화
- [ ] 푸터 "데모 잠금" → 게이트 화면 복귀(쿠키 삭제)

## D. 운영 오류·남용 방어

- [ ] 잘못된 요청(빈 본문/짧은 입력/3001자) → 400/413 계열 명시 오류
- [ ] 허용 외 모델 ID → 400 `model_not_allowed`(입력 반사 없음)
- [ ] 11회 연속 분석 요청 → **429 + `retry-after: 60`** (엣지 rate limit 실동작)
- [ ] 새 브라우저(다른 세션/IP 조건)와 동일 브라우저 비교 — 키 네임스페이스(ip:/session:) 분리 확인
- [ ] 바인딩 누락 시나리오는 실서비스에서 유발 불가 — 코드 경로(fail-closed 503)는 Phase A 테스트로 갈음, 로그에서 `rate_limit_unavailable` 부재 확인
- [ ] Solar API 오류(키 잘못 등) → 샘플 폴백 + 명시 notice(빈 화면·크래시 없음)
- [ ] PII 입력(전화·이메일 포함 자기소개) → 인용·화면에 원문 PII 미노출(`[이메일]` 등 마스킹 표기)
- [ ] 브라우저 console error 0
- [ ] `wrangler tail` 로그에 API 키·접근 코드·세션 토큰·원문 PII 미출력

## E. 실제 기기

| 기기/조건 | 확인 |
|---|---|
| iPhone Safari (390px) | 게이트→4단계 여정, 홈 화면 아이콘, 공유 시트 |
| Android Chrome (360px) | 동일 여정 + PWA 설치 아이콘 |
| 데스크톱 Chrome (1440) | 전체 여정 + 탭 favicon |
| 데스크톱 Safari/WebKit | 여정 + **인쇄 미리보기 대화상자**(Phase A에서 자동화 불가였던 항목) |
| 태블릿 (768) | 레이아웃·터치 타깃 |
| 화면 회전 | 모바일 가로↔세로 overflow 없음 |
| 키보드 전용 | Tab 순서·포커스 링·건너뛰기 없이 STEP4 도달 |
| 인쇄 | 실제 프린터 또는 PDF 저장 — 배경 OFF에서도 카드 가독(#26) |
