# 피드백 확인 방법 (운영자용)

관리자 페이지와 알림 메일은 이번 범위에 없습니다. Supabase 대시보드에서 직접 확인합니다.

## 1. 글 읽기

**Table Editor → `feedback_submissions`**

| 열 | 뜻 |
|---|---|
| `id` | 이 피드백의 식별자. 첨부 이미지를 찾을 때 이 값을 씁니다. |
| `category` | `bug` 오류·버그 / `hard_to_use` 사용하기 어려움 / `wording` 설명·문구 / `design` 디자인 / `feature_idea` 기능 제안 / `trust_privacy` 신뢰·개인정보 / `other` 기타 |
| `rating` | 만족도 1~5 (선택 항목이라 비어 있을 수 있습니다) |
| `message` | 피드백 글 |
| `page_path` | 어느 화면에서 보냈는지 (예: `/demo`) |
| `attachment_count` | 첨부 이미지 수 (0~3) |
| `status` | `new` → `triaged` → `resolved` / `wont_fix`. **사용자는 바꿀 수 없고 운영자만 바꿉니다.** |
| `user_id` | 보낸 사람. 이메일은 여기 복제하지 않습니다 — 필요하면 `auth.users`에서 조회하십시오. |

최근 것부터 보려면 `created_at` 내림차순으로 정렬하십시오.

## 2. 첨부 이미지 찾기

이미지는 **비공개 버킷** `feedback-attachments`에 있고 공개 주소가 없습니다.
경로 규칙은 다음과 같습니다.

```
{user_id}/{feedback_id}/{임의값}.{png|jpg|webp}
```

### 방법 A — feedback_id로 경로를 먼저 조회 (권장)

**SQL Editor**에서:

```sql
select a.storage_path, a.mime_type, a.size_bytes, a.created_at
from public.feedback_attachments a
where a.feedback_id = '여기에-feedback-id-붙여넣기'
order by a.created_at;
```

나온 `storage_path`를 **Storage → feedback-attachments**에서 그대로 찾아 열면 됩니다.

### 방법 B — 글과 첨부를 한 번에 보기

```sql
select f.id, f.created_at, f.category, f.rating, f.page_path, f.message,
       coalesce(array_agg(a.storage_path) filter (where a.id is not null), '{}') as attachments
from public.feedback_submissions f
left join public.feedback_attachments a on a.feedback_id = f.id
where f.status = 'new'
group by f.id
order by f.created_at desc;
```

### 방법 C — Storage에서 폴더로 내려가기

**Storage → feedback-attachments →** `user_id` 폴더 → `feedback_id` 폴더.
글을 먼저 읽고 오는 경우가 대부분이라 방법 A가 더 빠릅니다.

## 3. 처리했으면 상태 바꾸기

Table Editor에서 `status`를 직접 수정하십시오. 사용자에게는 이 열의 수정 권한이 없습니다
(컬럼 단위 권한으로 `attachment_count`만 열려 있습니다).

## 4. 알아 두면 좋은 규칙

- 사용자는 **자기 피드백만** 조회·삭제할 수 있습니다(RLS). 비로그인 사용자는 접근 자체가 막힙니다.
- 이미지는 확장자가 아니라 **실제 파일 시그니처**로 검증합니다. SVG·GIF·실행 파일은 저장되지 않습니다.
- 업로드 도중 실패하면 이미 올라간 파일과 피드백 행을 함께 지웁니다 — 고아 파일이 남지 않습니다.
- 사용자가 탈퇴하면 피드백 행이 연쇄 삭제됩니다. **Storage 파일은 자동 삭제되지 않으므로**, 탈퇴 처리 시
  해당 `user_id` 폴더를 함께 비워 주십시오(현재는 수동 작업입니다 — Phase 2에서 자동화 예정).
- 피드백 글과 이미지는 **어떤 AI 제공자에게도 자동 전송하지 않습니다.**
