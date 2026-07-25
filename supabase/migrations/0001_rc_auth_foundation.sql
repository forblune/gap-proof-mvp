-- Gate 7(#43) · ADR-0001: 회원·이용량·초대 코드 로컬 기반 스키마 (운영 반영은 Hard Stop — 사용자 승인 필요)
-- 패턴 출처: mindhub-psych-emr 0002_auth_rls.sql의 security-definer 헬퍼 구조를 진로 도메인으로 치환.
-- 원칙: auth.uid() 격리 · 초대 코드 평문 저장 금지(해시) · ledger/consent/audit는 append-only · 개인정보 최소화.

create extension if not exists pgcrypto;
create schema if not exists app;

-- ── 헬퍼 ──────────────────────────────────────────────────────────────
create or replace function app.current_uid() returns uuid
language sql stable as $$ select auth.uid() $$;

-- ── 테이블 ────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  age14_confirmed boolean not null default false, -- 만 14세 이상 확인(가입 시)
  created_at timestamptz not null default now(),
  deleted_at timestamptz -- 탈퇴(soft delete 마커; 개인 데이터는 즉시 삭제 함수로 제거)
);

create table public.consent_records ( -- 동의 버전 기록(append-only)
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc text not null check (doc in ('privacy', 'terms')),
  version text not null,
  consented_at timestamptz not null default now()
);

create table public.usage_entitlements ( -- 이용 한도(쓰기는 definer 함수만)
  user_id uuid primary key references public.profiles (id) on delete cascade,
  free_quota integer not null default 3 check (free_quota >= 0),
  extra_quota integer not null default 0 check (extra_quota >= 0),
  refresh_at timestamptz
);

create table public.usage_ledger ( -- 사용 내역(append-only)
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('analyze')),
  model text,
  used_at timestamptz not null default now()
);

create table public.invite_codes ( -- 평문 금지: sha256 해시만 저장
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (char_length(code_hash) = 64),
  label text not null,
  extra_quota integer not null check (extra_quota > 0),
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses > 0),
  per_account_limit integer not null default 1 check (per_account_limit > 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invite_redemptions (
  id bigint generated always as identity primary key,
  invite_id uuid not null references public.invite_codes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  redeemed_at timestamptz not null default now()
);
create index invite_redemptions_by_invite on public.invite_redemptions (invite_id);
create index invite_redemptions_by_user_invite on public.invite_redemptions (user_id, invite_id);

create table public.audit_logs ( -- 감사 기록(append-only, 사용자 직접 접근 불가)
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  subject text,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.usage_entitlements enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.invite_codes enable row level security;
alter table public.invite_redemptions enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: 본인 행만
create policy profiles_select_own on public.profiles for select using (id = app.current_uid());
create policy profiles_insert_own on public.profiles for insert with check (id = app.current_uid());
create policy profiles_update_own on public.profiles for update using (id = app.current_uid());

-- consent: 본인 기록 조회·추가만(수정·삭제 정책 없음 = append-only)
create policy consent_select_own on public.consent_records for select using (user_id = app.current_uid());
create policy consent_insert_own on public.consent_records for insert with check (user_id = app.current_uid());

-- entitlements: 본인 조회만(쓰기는 definer 함수)
create policy entitlements_select_own on public.usage_entitlements for select using (user_id = app.current_uid());

-- ledger: 본인 조회만(쓰기는 definer 함수 = 직접 insert 불가)
create policy ledger_select_own on public.usage_ledger for select using (user_id = app.current_uid());

-- invite_codes: 사용자 정책 없음 → 코드 존재조차 열람 불가(교환은 함수로만)
-- invite_redemptions: 본인 내역 조회만
create policy redemptions_select_own on public.invite_redemptions for select using (user_id = app.current_uid());

-- audit_logs: 사용자 정책 없음(서비스 전용)

-- ── security definer 함수 ─────────────────────────────────────────────
-- 초대 코드 교환: 평문 → 해시 대조, 만료/회수/총사용/계정당 제한 검사, 감사 기록
create or replace function app.redeem_invite(p_code text) returns text
language plpgsql security definer set search_path = public, app as $$
declare
  v_uid uuid := app.current_uid();
  v_invite public.invite_codes%rowtype;
  v_total integer;
  v_mine integer;
begin
  if v_uid is null then return 'unauthenticated'; end if;
  select * into v_invite from public.invite_codes
    where code_hash = encode(digest(p_code, 'sha256'), 'hex');
  insert into public.audit_logs (actor, action, subject, detail)
    values (v_uid, 'invite.attempt', coalesce(v_invite.id::text, 'no-match'), '{}'::jsonb);
  if v_invite.id is null then return 'invalid'; end if;
  if v_invite.revoked_at is not null then return 'revoked'; end if;
  if v_invite.expires_at < now() then return 'expired'; end if;
  select count(*) into v_total from public.invite_redemptions where invite_id = v_invite.id;
  if v_total >= v_invite.max_uses then return 'exhausted'; end if;
  select count(*) into v_mine from public.invite_redemptions where invite_id = v_invite.id and user_id = v_uid;
  if v_mine >= v_invite.per_account_limit then return 'limit'; end if;
  insert into public.invite_redemptions (invite_id, user_id) values (v_invite.id, v_uid);
  insert into public.usage_entitlements (user_id, extra_quota) values (v_uid, v_invite.extra_quota)
    on conflict (user_id) do update set extra_quota = public.usage_entitlements.extra_quota + excluded.extra_quota;
  insert into public.audit_logs (actor, action, subject, detail)
    values (v_uid, 'invite.redeem', v_invite.id::text, jsonb_build_object('extra', v_invite.extra_quota));
  return 'ok';
end $$;

-- 사용 차감: 한도 검사 후 ledger 기록, 남은 횟수 반환(-1 = 한도 초과)
create or replace function app.record_usage(p_model text) returns integer
language plpgsql security definer set search_path = public, app as $$
declare
  v_uid uuid := app.current_uid();
  v_free integer; v_extra integer; v_used integer; v_remaining integer;
begin
  if v_uid is null then return -2; end if;
  insert into public.usage_entitlements (user_id) values (v_uid) on conflict do nothing;
  select free_quota, extra_quota into v_free, v_extra from public.usage_entitlements where user_id = v_uid;
  select count(*) into v_used from public.usage_ledger where user_id = v_uid;
  v_remaining := (v_free + v_extra) - v_used;
  if v_remaining <= 0 then return -1; end if;
  insert into public.usage_ledger (user_id, kind, model) values (v_uid, 'analyze', p_model);
  return v_remaining - 1;
end $$;

-- 탈퇴: 개인 데이터 즉시 삭제 + 프로필 soft-delete 마커 + 감사 기록
create or replace function app.delete_account() returns void
language plpgsql security definer set search_path = public, app as $$
declare v_uid uuid := app.current_uid();
begin
  if v_uid is null then return; end if;
  delete from public.usage_ledger where user_id = v_uid;
  delete from public.consent_records where user_id = v_uid;
  delete from public.usage_entitlements where user_id = v_uid;
  delete from public.invite_redemptions where user_id = v_uid;
  update public.profiles set display_name = null, deleted_at = now() where id = v_uid;
  insert into public.audit_logs (actor, action, subject) values (v_uid, 'account.delete', v_uid::text);
end $$;

revoke all on function app.redeem_invite(text) from public;
revoke all on function app.record_usage(text) from public;
revoke all on function app.delete_account() from public;
grant execute on function app.redeem_invite(text) to authenticated;
grant execute on function app.record_usage(text) to authenticated;
grant execute on function app.delete_account() to authenticated;
