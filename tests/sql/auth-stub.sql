-- 로컬 검증용 Supabase auth 스텁(운영 Supabase에는 auth 스키마가 기본 제공됨).
-- auth.uid()는 세션 GUC(request.jwt.claim.sub)를 읽는다 — Supabase 로컬 테스트 관행.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
-- Supabase의 역할 흉내
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;
grant usage on schema public, app, auth to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
