-- 적용 버전: 20260728093227 (gapproof_revoke_trigger_function_rpc) — 운영 적용 완료
--
-- 두 함수는 트리거 전용이며 REST RPC(/rest/v1/rpc/...)로 호출될 이유가 없다.
-- 역할별 REVOKE만으로는 PUBLIC 기본 권한이 남아 우회되므로 PUBLIC에서 먼저 회수한다.
-- 적용 후 Supabase security advisor 경고 0건을 확인했다.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
