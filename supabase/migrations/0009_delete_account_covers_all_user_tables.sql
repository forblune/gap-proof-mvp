-- 탈퇴 시 실제로 지워지지 않던 사용자 데이터를 지운다.
--
-- 문제 1 — 고지와 동작의 불일치:
-- 개인정보 처리방침(app/privacy/page.tsx)은 "탈퇴하면 경험·분석 기록·Proof Card·학습 기록·
-- 발급 문서·외부 증빙·프로필이 모두 함께 삭제된다"고 적었다. 그런데 0001 의
-- app.delete_account() 는 usage_ledger·consent_records·usage_entitlements·invite_redemptions
-- 네 개만 지우고 profiles 는 soft-delete 만 했다. 위 테이블들은 auth.users 를 참조하는데
-- 그 함수는 auth.users 행을 지우지 않으므로 연쇄 삭제가 발화하지 않는다 — 방침이 약속한
-- 데이터가 그대로 남는다.
--
-- 문제 2 — 저장소와 운영의 불일치:
-- 0001(app 스키마·초대·사용량 원장·감사 로그)은 운영 프로젝트에 **적용된 적이 없다**.
-- 운영에는 public 의 9개 테이블만 있고 app 스키마 자체가 없다. 앱 코드도 0001 의 객체를
-- 한 번도 참조하지 않는다. 그래서 app.delete_account() 를 고치는 것만으로는 운영에서
-- 아무 일도 일어나지 않는다.
--
-- 그래서 삭제 진입점을 public.delete_my_account() 로 새로 둔다. auth.uid() 만 쓰므로
-- app 스키마 유무와 무관하게 동작하고, 0001 이 적용된 환경에서는 그쪽 테이블도 함께 지운다.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  -- 0001 이 적용된 환경에만 있는 테이블. 없으면 건너뛴다.
  v_optional text[] := array['usage_ledger', 'consent_records', 'usage_entitlements', 'invite_redemptions'];
  v_table text;
begin
  if v_uid is null then return; end if;

  -- 모든 환경에 있는 사용자 소유 테이블. 자식 → 부모 순서로 지워 외래키 위반을 피한다.
  delete from public.feedback_attachments where user_id = v_uid;   -- 제출을 참조
  delete from public.feedback_submissions where user_id = v_uid;

  delete from public.certificates where user_id = v_uid;
  delete from public.learning_records where user_id = v_uid;
  delete from public.proof_cards where user_id = v_uid;

  delete from public.external_credentials where user_id = v_uid;   -- experiences 를 참조
  delete from public.analyses where user_id = v_uid;
  delete from public.experiences where user_id = v_uid;

  foreach v_table in array v_optional loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where user_id = $1', v_table) using v_uid;
    end if;
  end loop;

  -- 프로필까지 지운다. 운영 스키마에는 초대 코드 시스템이 없어 재사용을 막으려고
  -- 탈퇴 흔적을 남길 이유가 없다 — 방침대로 "프로필도 함께 삭제"가 성립한다.
  delete from public.profiles where id = v_uid;

  if to_regclass('public.audit_logs') is not null then
    execute 'insert into public.audit_logs (actor, action, subject) values ($1, ''account.delete'', $2)'
      using v_uid, v_uid::text;
  end if;
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
