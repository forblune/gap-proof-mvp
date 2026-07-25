# RC 릴리스 준비 — 독립 리뷰·배포 리허설 (자율 루프, 2026-07-26)

- 브랜치 `qa/rc-release-prep`(base rc `c1afc34`) · PR #63 대상 사전 감사

## 1. 플랫폼·상태 확정(실측)

- **Cloudflare Workers 확정**: `server: cloudflare`+`cf-ray`, Cloudflare 프록시 A레코드, 저장소에 wrangler.jsonc만 존재. **Render·Vercel·GH Pages 미사용 → Render MCP 문제는 배포 Blocker 아님**
- PR #63: OPEN·MERGEABLE·CI 부재(자동 배포 없음 — **main 병합≠배포**)·리뷰 0
- 운영 `cece759c`(1차): /why /who /privacy /terms /demo 전부 404, 홈=게이트 — RC 차이 실측 완료

## 2. 독립 릴리스 리뷰(멀티에이전트 4관점→적대적 검증) 결과와 수정

**확정 5건 → 전부 수정:**
1. (P1) privacy "원본 IP 미저장" 주장 ↔ 코드가 원본 IP를 한도 키로 사용 → **clientKey의 IP도 SHA-256 digest16으로**(코드를 방침에 맞춤) + 방침 문구 정밀화
2. (P1) 홈 "준비 중" 목록이 이번 RC 구현 기능(TXT/MD·AI 가져오기·긴 입력)을 미래로 표기 → 지금/다음 경계 정정(다음: 회원·PDF/DOCX·온통청년·품질 고도화)
3. (P1) /who의 AI 대화 카드가 구현된 흐름을 "준비 중"으로 안내 → 현재형 정정
4. (P1) privacy·about·how-it-works·technology가 구명칭 "기록 삭제/데모 잠금" 참조 → "새 분석 시작하기/데모 나가기"로 현행화
5. (P2) [선택] 통계 체크박스가 실재하지 않는 수집을 전제 → 보조문 정직화(수집 없음·Brief 표시에만 반영)

**verify 유실분(세션 한도) 중 자체 재검증으로 실재 확인 5건 → 전부 수정:**
6. (P1) `max_tokens: 700` — V2 JSON이 잘려 **운영 실연결이 전부 샘플 폴백될 결함** → 2048
7. (P1) draft 상한 20,000 < 무제한 붙여넣기 → 초과 시 draft 전체 소실 → 100,000 + 경계 테스트
8. (P1) parseDraft가 V2 필드 무검증 → 손상 draft로 렌더 크래시 가능 → 필드 단위 위생 처리(해당 필드만 제거) + 테스트
9. (P2) 실연결 후에도 "샘플 여정 완료" 배지 → 소스별 분기
10. (P2) `?sample=1` 잔류 → 나가기 시 URL 정리(재로드 샘플 재진입 방지, e2e 확인)
+ signals 중복 dedupe(렌더 key 충돌 방지) · SQL redeem race는 운영 전환 보강 항목으로 AUTH_TRANSITION_PLAN에 기록

**기각(적대 검증에서 반박)**: rejected 4건 — 티켓 없음

## 3. 신규 문서

- `docs/deployment/GAPPROOF_DEPLOYMENT_TOPOLOGY.md`(플랫폼 확정 근거) · `GAPPROOF_RELEASE_RUNBOOK.md`(경로 B 기본/A′ 선택·롤백·smoke) · `docs/rc/PRODUCTION_VS_RC_DIFF.md`(라우트·기능·계약 차이와 사용자 영향) · `docs/rc/REAL_DEVICE_CHECKLIST.md`(PASS/FAIL/NOT_TESTED 3세트)

## 4. 검증

- `npm test` **37/37**(+draft 경계·V2 위생·signals dedupe·savedAt 의미론·더블클릭 가드) · lint 레거시 4 외 0 · tsc 레거시 2 외 0 · diff OK
- e2e 5스위트 PASS + URL 정리 검증 + **QA SWEEP PASS** · Secret·PII 스캔 0(010-1234-5678은 마스킹 검증용 합성 fixture — 출력 미포함 단언과 세트)
- Solar 유료 호출 0 · 운영·시크릿·콘솔 변경 0
