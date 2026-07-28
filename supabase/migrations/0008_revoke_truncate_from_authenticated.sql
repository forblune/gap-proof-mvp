-- 0008 — authenticated 역할에서 TRUNCATE / REFERENCES / TRIGGER 권한을 회수한다.
--
-- 보안 심사 지적(CWE-732): TRUNCATE 는 RLS 를 전혀 거치지 않는 유일한 DML 이다.
-- 지금은 PostgREST 경로로 실행할 수 없어 즉시 악용되지는 않지만,
-- 직접 연결이나 동적 SQL 경로가 하나라도 생기는 순간 전체 삭제가 된다.
-- 앱이 실제로 쓰는 권한은 select/insert/update/delete 뿐이므로 나머지는 남길 이유가 없다.
--
-- REFERENCES / TRIGGER 도 앱이 쓰지 않는다. 스키마를 바꿀 수 있는 권한을
-- 최종 사용자 역할이 들고 있을 이유가 없어 함께 회수한다.

revoke truncate, references, trigger on all tables in schema public from authenticated;

-- 앞으로 만들어질 테이블에도 같은 기본값이 적용되도록 default privileges 를 조정한다.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- 확인: 아래 질의가 0행이어야 한다.
--   select table_name, privilege_type
--   from information_schema.role_table_grants
--   where grantee = 'authenticated'
--     and table_schema = 'public'
--     and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER');
