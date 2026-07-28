-- 적용 버전: 20260728093122 (gapproof_grants_for_authenticated) — 운영 적용 완료
--
-- RLS 정책만으로는 PostgREST가 동작하지 않는다: authenticated 역할에 테이블 권한이 필요하다.
-- 권한을 주더라도 RLS 정책이 행 단위로 본인 행만 통과시킨다(권한 = 문 단위, RLS = 행 단위).
-- anon에는 어떤 권한도 주지 않는다 → 비로그인 사용자는 보호 데이터에 접근할 수 없다.

grant select, insert, update, delete on public.proof_cards to authenticated;
grant select, insert, update, delete on public.learning_records to authenticated;
grant select, insert, update, delete on public.certificates to authenticated;
grant select, update on public.profiles to authenticated;

revoke all on public.proof_cards from anon;
revoke all on public.learning_records from anon;
revoke all on public.certificates from anon;
revoke all on public.profiles from anon;
