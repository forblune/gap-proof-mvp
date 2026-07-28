-- 적용 버전: gapproof_experiences_external_credentials_and_touch — 운영 적용 완료
--
-- 경험·분석 기록, 외부 증빙, updated_at 자동 갱신.
-- 이미 존재하는 객체는 if not exists / drop ... if exists 로 중복 적용을 방지한다.

-- 1) updated_at 자동 갱신 트리거 함수(트리거 전용 — RPC로 열지 않는다)
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.touch_updated_at() from public;
revoke execute on function public.touch_updated_at() from anon, authenticated;

-- 2) 사용자 소유 경험 원문 + 그 분석 결과
--    개인정보 원칙: 경험 원문 저장은 기본이 아니라 사용자의 명시적 동의(stores_raw_text)가 있을 때만 채운다.
--    체크 제약으로 "동의 없이 원문 저장"이 데이터 계층에서 불가능하게 만든다.
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  raw_text text,
  stores_raw_text boolean not null default false,
  masked_kinds text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_raw_text_requires_consent
    check (raw_text is null or stores_raw_text = true)
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id uuid references public.experiences(id) on delete cascade,
  -- 실제 Solar 연결인지 규칙 기반 샘플인지 반드시 구분해 저장한다(샘플을 성공으로 표시 금지).
  source text not null check (source in ('solar', 'sample')),
  model text,
  role_id text,
  -- 사용자가 확인한 항목만 결과에 쓰인다. 확인 상태를 그대로 보존한다.
  claims jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) 외부 증빙(외부 기관 발급 수료증·자격증)
--    GapProof가 진위를 검증하지 않는다는 사실을 열(verification_status)로 남긴다.
create table if not exists public.external_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  issuer text not null,
  issued_on date,
  document_number text,
  document_url text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'user_attested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) certificates에 updated_at 보강(0002 시점 테이블에는 없었다)
alter table public.certificates add column if not exists updated_at timestamptz not null default now();

-- 5) 신규 테이블 RLS + 정책 + 권한 + 인덱스 (기존 3개 테이블과 동일 규칙)
do $$
declare
  t text;
begin
  foreach t in array array['experiences', 'analyses', 'external_credentials'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_sel_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_sel_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_ins_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_ins_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_upd_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_upd_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_del_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_del_own', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create index if not exists %I on public.%I (user_id, created_at desc)', t || '_user_created_idx', t);
  end loop;
end;
$$;

-- 6) 모든 사용자 데이터 테이블에 updated_at 트리거 부착
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'proof_cards', 'learning_records', 'certificates', 'experiences', 'analyses', 'external_credentials'] loop
    execute format('drop trigger if exists %I on public.%I', 'touch_' || t, t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', 'touch_' || t, t);
  end loop;
end;
$$;
