-- Gate 7(#43) RLS·함수 검증 — 실패 시 RAISE EXCEPTION으로 psql이 비정상 종료(ON_ERROR_STOP).
\set ON_ERROR_STOP on

-- 사용자 2명 준비
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

-- 초대 코드 1개(평문 'RC-DEMO-CODE' — 해시만 저장됨을 검증)
insert into public.invite_codes (code_hash, label, extra_quota, expires_at, max_uses, per_account_limit)
  values (encode(digest('RC-DEMO-CODE', 'sha256'), 'hex'), '심사위원', 5, now() + interval '7 days', 2, 1);

-- ── 사용자 A 세션 ──
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.profiles (id, display_name, age14_confirmed) values (auth.uid(), '사용자A', true);
insert into public.consent_records (user_id, doc, version) values (auth.uid(), 'privacy', 'v0.1');

do $$ begin
  -- A는 자기 프로필만 본다
  if (select count(*) from public.profiles) <> 1 then raise exception 'A must see exactly own profile'; end if;
  -- 초대 코드 테이블은 열람 불가(정책 없음)
  if (select count(*) from public.invite_codes) <> 0 then raise exception 'invite_codes must be invisible to users'; end if;
  -- 초대 교환 성공 → extra 5
  if app.redeem_invite('RC-DEMO-CODE') <> 'ok' then raise exception 'redeem should succeed'; end if;
  if (select extra_quota from public.usage_entitlements where user_id = auth.uid()) <> 5 then raise exception 'extra quota mismatch'; end if;
  -- 계정당 1회 제한
  if app.redeem_invite('RC-DEMO-CODE') <> 'limit' then raise exception 'per-account limit should block'; end if;
  -- 잘못된 코드
  if app.redeem_invite('WRONG') <> 'invalid' then raise exception 'invalid code should be rejected'; end if;
end $$;

-- 사용 차감: free 3 + extra 5 = 8 → 첫 차감 후 잔여 7
do $$ begin
  if app.record_usage('solar-pro3') <> 7 then raise exception 'remaining should be 7'; end if;
  if (select count(*) from public.usage_ledger where user_id = auth.uid()) <> 1 then raise exception 'ledger row missing'; end if;
end $$;

-- ledger 직접 조작 불가(정책상 insert 금지)
do $$ begin
  begin
    insert into public.usage_ledger (user_id, kind, model) values (auth.uid(), 'analyze', 'hack');
    raise exception 'direct ledger insert must fail';
  exception when insufficient_privilege or check_violation or others then
    if sqlerrm = 'direct ledger insert must fail' then raise; end if;
  end;
end $$;

-- audit_logs 접근 불가
do $$ begin
  if (select count(*) from public.audit_logs) <> 0 then raise exception 'audit must be invisible to users'; end if;
end $$;

-- ── 사용자 B 세션: 격리 확인 ──
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.profiles (id, age14_confirmed) values (auth.uid(), true);
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'B must not see A profile'; end if;
  if (select count(*) from public.consent_records) <> 0 then raise exception 'B must not see A consents'; end if;
  if (select count(*) from public.usage_ledger) <> 0 then raise exception 'B must not see A ledger'; end if;
  -- B의 두 번째 교환 → 총사용 한도(max_uses=2) 내 성공
  if app.redeem_invite('RC-DEMO-CODE') <> 'ok' then raise exception 'B redeem should succeed'; end if;
end $$;

-- B가 타인 소유로 위장 insert 불가(with check)
do $$ begin
  begin
    insert into public.consent_records (user_id, doc, version)
      values ('11111111-1111-1111-1111-111111111111', 'terms', 'v0.1');
    raise exception 'cross-user insert must fail';
  exception when insufficient_privilege or others then
    if sqlerrm = 'cross-user insert must fail' then raise; end if;
  end;
end $$;

-- 탈퇴: 개인 데이터 삭제 + soft-delete 마커
do $$ begin
  perform app.delete_account();
  if (select count(*) from public.invite_redemptions) <> 0 then raise exception 'redemptions must be purged'; end if;
  if (select deleted_at from public.profiles where id = auth.uid()) is null then raise exception 'profile must be marked deleted'; end if;
end $$;

-- ── anon: 아무것도 안 보임 ──
reset request.jwt.claim.sub;
set role anon;
do $$ begin
  if (select count(*) from public.profiles) <> 0 then raise exception 'anon must see nothing'; end if;
  if (select count(*) from public.invite_codes) <> 0 then raise exception 'anon must not see invites'; end if;
end $$;

reset role;
-- 관리자 시점 확인: 평문 코드가 어디에도 없다
do $$ begin
  if exists (select from public.invite_codes where code_hash = 'RC-DEMO-CODE') then
    raise exception 'plaintext code must never be stored';
  end if;
  if (select count(*) from public.audit_logs where action = 'invite.redeem') <> 2 then
    raise exception 'audit should record 2 redemptions';
  end if;
end $$;

select 'RLS_VALIDATION_PASS' as result;
