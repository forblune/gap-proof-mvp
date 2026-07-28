-- 적용 버전: execute_sql로 적용(Storage 스키마 대상) — 운영 적용 완료
--
-- 비공개 Storage bucket + 사용자별 경로 격리.
-- 공개 URL을 만들지 않는다. 운영 확인은 대시보드 또는 짧은 만료의 signed URL만 사용한다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-attachments', 'feedback-attachments', false, 5242880,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png','image/jpeg','image/webp'];

-- 경로 첫 segment가 본인 user_id일 때만 업로드·조회·삭제 가능.
drop policy if exists feedback_upload_own on storage.objects;
create policy feedback_upload_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists feedback_read_own on storage.objects;
create policy feedback_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists feedback_delete_own on storage.objects;
create policy feedback_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
