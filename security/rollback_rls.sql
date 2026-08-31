-- 【緊急ロールバック】施錠後にアプリが不調なら、これを実行すると即座に元の公開状態に戻ります。
-- 16テーブルすべてのRLSをOFFにする（データは変更しません）。
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employees','i_statuses','x_statuses','internals','externals',
    'fukumeisho','self_trainings','manuals','committees','committee_members',
    'committee_meetings','committee_notices','committee_meeting_reads',
    'general_notices','seminars','seminar_monthly_views'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
