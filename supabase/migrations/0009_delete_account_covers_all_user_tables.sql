-- 탈퇴 시 실제로 지워지지 않던 사용자 데이터를 지운다.
--
-- 문제: 개인정보 처리방침(app/privacy/page.tsx)은 "탈퇴하면 경험·분석 기록·Proof Card·학습 기록·
-- 발급 문서·외부 증빙·프로필이 모두 함께 삭제된다 — 데이터베이스의 연쇄 삭제로 처리한다" 고 적었다.
-- 그런데 app.delete_account() 는 usage_ledger·consent_records·usage_entitlements·invite_redemptions
-- 네 개만 지우고 profiles 는 soft-delete(deleted_at 세팅)만 했다.
--
-- 위 네 테이블은 public.profiles 를 참조하지만, 정작 방침이 열거한 테이블들
-- (experiences·analyses·external_credentials·proof_cards·learning_records·certificates·
--  feedback_submissions·feedback_attachments)은 auth.users 를 참조한다. delete_account 는
-- auth.users 행을 지우지 않으므로 그쪽 연쇄 삭제는 발화하지 않았다 — 방침이 약속한 데이터가
-- 그대로 남는다. 사실이 아닌 개인정보 고지라 문구가 아니라 동작을 고친다.
--
-- 여기서는 auth 스키마를 건드리지 않고 public 의 사용자 소유 테이블을 명시적으로 지운다.
-- 자식 → 부모 순서로 지워 외래키 위반을 피한다.
create or replace function app.delete_account() returns void
language plpgsql security definer set search_path = public, app as $$
declare v_uid uuid := app.current_uid();
begin
  if v_uid is null then return; end if;

  -- 피드백(첨부가 제출을 참조하므로 첨부 먼저)
  delete from public.feedback_attachments where user_id = v_uid;
  delete from public.feedback_submissions where user_id = v_uid;

  -- 결과물
  delete from public.certificates where user_id = v_uid;
  delete from public.learning_records where user_id = v_uid;
  delete from public.proof_cards where user_id = v_uid;

  -- 원문과 분석(외부 증빙이 experiences 를 참조하므로 증빙 먼저)
  delete from public.external_credentials where user_id = v_uid;
  delete from public.analyses where user_id = v_uid;
  delete from public.experiences where user_id = v_uid;

  -- 계정 운영 기록
  delete from public.usage_ledger where user_id = v_uid;
  delete from public.consent_records where user_id = v_uid;
  delete from public.usage_entitlements where user_id = v_uid;
  delete from public.invite_redemptions where user_id = v_uid;

  -- 프로필은 soft-delete 를 유지한다. 같은 계정으로 재가입했을 때 초대 코드 재사용을
  -- 막으려면 탈퇴 사실 자체는 남아 있어야 한다. 표시 이름 등 식별 정보는 지운다.
  update public.profiles set display_name = null, deleted_at = now() where id = v_uid;

  insert into public.audit_logs (actor, action, subject) values (v_uid, 'account.delete', v_uid::text);
end $$;

revoke all on function app.delete_account() from public;
grant execute on function app.delete_account() to authenticated;
