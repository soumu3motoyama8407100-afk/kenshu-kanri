-- 【診断用・読み取りのみ】現在のRLS状態とポリシーを確認します（データは変更しません）。
-- Supabase の SQL Editor に貼り付けて実行し、結果を Claude に貼ってください。

-- ① 各テーブルの RLS が ON/OFF か
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('employees','i_statuses','x_statuses','internals','externals',
    'fukumeisho','self_trainings','manuals','committees','committee_members',
    'committee_meetings','committee_notices','committee_meeting_reads',
    'general_notices','seminars','seminar_monthly_views')
order by relname;

-- ② いま設定されているポリシー一覧（特に employees の qual に "employees" が出てくると再帰）
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
