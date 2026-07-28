-- 적용 버전: gapproof_feedback_submissions_and_attachments — 운영 적용 완료
-- (동일 세션에서 gapproof_feedback_attachment_count_column_grant 도 함께 적용됨 — 파일 하단 참고)
--
-- 피드백 수집 — 로그인 사용자만. 본문과 첨부 이미지는 사용자 소유 데이터로 다룬다.
-- 원칙:
--  - user_id와 status는 클라이언트 요청값을 신뢰하지 않는다(서버가 auth.uid()로 채운다).
--  - 길이·개수·범위를 DB 제약으로 강제해, API가 뚫려도 잘못된 행이 남지 않게 한다.
--  - 피드백 이미지는 어떤 AI 제공자에게도 자동 전송하지 않는다(코드·문서 모두 동일).

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer check (rating is null or rating between 1 and 5),
  category text not null check (category in (
    'bug', 'hard_to_use', 'wording', 'design', 'feature_idea', 'trust_privacy', 'other'
  )),
  message text not null check (char_length(message) between 5 and 4000),
  page_path text check (page_path is null or char_length(page_path) <= 300),
  status text not null default 'new' check (status in ('new', 'triaged', 'resolved', 'wont_fix')),
  attachment_count integer not null default 0 check (attachment_count between 0 and 3),
  build_sha text check (build_sha is null or char_length(build_sha) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- {user_id}/{feedback_id}/{uuid}.{ext} 형태. 공개 URL을 만들지 않는다.
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists feedback_attachments_path_uniq
  on public.feedback_attachments (storage_path);

do $$
declare
  t text;
begin
  foreach t in array array['feedback_submissions', 'feedback_attachments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_sel_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_sel_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_ins_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_ins_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_del_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_del_own', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create index if not exists %I on public.%I (user_id, created_at desc)', t || '_user_created_idx', t);
  end loop;
end;
$$;

-- status는 운영자만 바꾼다 — 사용자에게 전체 update 권한을 주지 않는다.
grant select, insert, delete on public.feedback_submissions to authenticated;
grant select, insert, delete on public.feedback_attachments to authenticated;

drop trigger if exists touch_feedback_submissions on public.feedback_submissions;
create trigger touch_feedback_submissions
  before update on public.feedback_submissions
  for each row execute function public.touch_updated_at();

create index if not exists feedback_attachments_feedback_idx
  on public.feedback_attachments (feedback_id);

-- ── 후속 적용분: attachment_count 컬럼 단위 권한 ────────────────────────────
-- 서버가 첨부 개수를 확정하려면 UPDATE가 필요하지만, status까지 열면 사용자가
-- 자기 피드백을 'resolved'로 바꿀 수 있다. 컬럼 단위로만 허용한다.
grant update (attachment_count) on public.feedback_submissions to authenticated;

drop policy if exists feedback_submissions_upd_count on public.feedback_submissions;
create policy feedback_submissions_upd_count on public.feedback_submissions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
