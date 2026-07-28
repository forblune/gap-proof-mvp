-- 적용 버전: 20260728093011 (gapproof_profiles_and_user_data_rls) — 운영 적용 완료
--
-- GapProof 회원 데이터 기반 스키마 + RLS.
-- 원칙:
--  - user_id는 요청 본문이 아니라 auth.uid()에서만 온다(with check로 위조를 데이터 계층에서 차단).
--  - to authenticated 로만 정책을 만든다 → publishable key가 유출돼도 anon은 어떤 행도 읽지 못한다.
--  - auth.users 삭제 시 cascade → 계정 삭제가 실제 데이터 삭제로 이어진다.
--  - (select auth.uid()) 형태는 행마다가 아니라 쿼리당 1회 평가된다.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  avatar_url text,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 프로필 행은 트리거가 만들고 auth.users 삭제로 지워진다(사용자 임의 생성·삭제 정책 없음).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 사용자 소유 데이터 --------------------------------------------------------

create table if not exists public.proof_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null,
  -- 확인된 항목의 구조화 데이터만 저장한다. 경험 원문(quote)은 별도 동의 없이 넣지 않는다.
  confirmed_skills jsonb not null default '[]'::jsonb,
  includes_quotes boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  competency_id text not null,
  competency_label text not null,
  source_title text not null,
  source_url text,
  required_question_count int not null default 0 check (required_question_count >= 0),
  answered_question_count int not null default 0 check (answered_question_count >= 0),
  understanding_checked boolean not null default false,
  performance_note text,
  artifacts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learning_record_id uuid references public.learning_records(id) on delete set null,
  kind text not null check (kind in ('learning', 'performance', 'external_record')),
  serial text not null,
  scope text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

do $$
declare
  t text;
begin
  foreach t in array array['proof_cards', 'learning_records', 'certificates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_sel_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_sel_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_ins_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_ins_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_upd_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_upd_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_del_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_del_own', t);
    execute format('create index if not exists %I on public.%I (user_id, created_at desc)', t || '_user_created_idx', t);
  end loop;
end;
$$;
