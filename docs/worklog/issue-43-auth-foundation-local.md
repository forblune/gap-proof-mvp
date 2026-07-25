# Issue #43 — Gate 7: 회원·이용량·초대 코드 (로컬 기반 · ADR-0001)

- Issue: #43 · 브랜치 `feat/43-auth-foundation-local`(base rc `315a2f0`) · 작업일 2026-07-25

## 판정(1단계 — Gate 0 ADR-0001 확정 재확인)

RC에서는 **로컬 완전 세트 설계·구현·검증까지, 운영 데모는 게이트 코드 유지.** 근거: 운영 Supabase·메일 인프라·콘솔이 전부 Hard Stop + 부분 공개 금지 + 법률 검토는 외부 조건. UI 노출 없음(코드 변경 0 — 스키마·문서·검증만).

## 산출물

- `supabase/migrations/0001_rc_auth_foundation.sql`: 7테이블 + RLS(본인 행 격리·invite/audit 사용자 비가시·consent/ledger append-only) + definer 3함수(redeem_invite: sha256 대조·만료·총사용·계정당·회수·감사 / record_usage: free+extra−used 차감 / delete_account: 즉시 삭제+마커) — MindHub `0002_auth_rls.sql` 헬퍼 패턴 치환
- `tests/sql/auth-stub.sql`(로컬 auth 스텁) + `tests/sql/validate-rls.sql`(검증 스위트)
- `docs/architecture/AUTH_TRANSITION_PLAN.md`: 일반/심사위원 흐름, 계정 열거 방지 문구 정책, 비밀번호 저장 금지, 카카오 최소 수집, 운영 전환 6단계(Hard Stop 게이트), 롤백

## 검증 (실 DB)

- 로컬 Postgres 16 임시 클러스터(initdb·pg_ctl — Docker/supabase CLI 불필요)에서 stub→migration→grants→validate 실행: **RLS_VALIDATION_PASS**
  - A/B/anon 격리, 교차 insert 차단(with check), invite 평문 무저장·계정당 1회·총 2회 한도, ledger 직접 insert 차단, audit 비가시·교환 2건 기록, 탈퇴 시 개인 데이터 purge
- 앱 코드·화면 무변경 → 기존 32/32·lint·tsc 영향 없음(diff는 SQL·문서만)

## 알려진 한계

- Supabase 실서비스의 auth 스키마와 스텁의 차이(트리거·클레임 구조)는 운영 적용 시 스모크로 재확인 · GoTrue 설정(메일 템플릿 등)은 운영 단계 항목
