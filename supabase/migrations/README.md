# supabase/migrations

`0002`~`0008`은 Supabase MCP `apply_migration`으로 **실제 운영 프로젝트(rnkrkdmvqnczaatlevpg)에 적용 완료**된 내용을
검토·재현 가능하도록 그대로 남긴 파일이다. 파일명 뒤 숫자는 적용 순서이며, 실제 적용 버전은 아래와 같다.

| 파일 | 적용 버전 | 적용 상태 |
|---|---|---|
| `0001_rc_auth_foundation.sql` | — | **미적용**(이전 설계 초안, 참고용으로만 보존) |
| `0002_profiles_and_user_data_rls.sql` | 20260728093011 | 적용됨 |
| `0003_grants_for_authenticated.sql` | 20260728093122 | 적용됨 |
| `0004_revoke_trigger_function_rpc.sql` | 20260728093227 | 적용됨 |
| `0005_experiences_external_credentials_and_touch.sql` | (동일 세션 적용) | 적용됨 |
| `0006_feedback_submissions_and_attachments.sql` | (동일 세션 적용) | 적용됨 |
| `0007_feedback_storage_bucket_and_policies.sql` | (동일 세션 적용, Storage 스키마) | 적용됨 |
| `0008_revoke_truncate_from_authenticated.sql` | gapproof_revoke_truncate_from_authenticated | 적용됨 |

모든 문은 `if not exists` / `drop ... if exists` 로 작성돼 재적용해도 중복 오류가 나지 않는다.

## 적용 후 확인한 사실 (2026-07-28)

- `authenticated` 에 남은 테이블 권한은 SELECT / INSERT / UPDATE / DELETE 뿐이다.
  TRUNCATE 는 RLS 를 거치지 않는 유일한 DML 이라 0008 에서 회수했다.
- `anon` 은 public 스키마 테이블에 대한 권한이 전혀 없다(`permission denied`, 42501).
- Storage 버킷 `feedback-attachments` 는 비공개이며, 정책이 경로 첫 구간을
  `auth.uid()` 와 대조한다(`attachmentPath` 가 만드는 경로와 일치).
- 보안 어드바이저 0건.
