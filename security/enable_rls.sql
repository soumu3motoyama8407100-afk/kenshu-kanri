-- ============================================================
-- 【最終段階（施錠）用】まだ実行しないでください。
-- ログインを正式認証に切り替えて動作確認できたあとに、Supabase の SQL Editor で実行します。
--
-- 効果：全テーブルで RLS を有効化し、「ログイン済み（authenticated）」のときだけ
--       読み書きできるようにします。ログインしていない第三者（公開キー/anon）は
--       いっさいアクセスできなくなります。
--
-- 元に戻す（万一アプリが動かない場合の緊急ロールバック）は、このファイル末尾のコメント参照。
-- ============================================================

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
    -- RLS を有効化
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    -- 既存の同名ポリシーがあれば作り直し（べき等）
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%I;', t);
    -- ログイン済みユーザーには全操作を許可（anon には何も許可しない＝遮断）
    EXECUTE format(
      'CREATE POLICY auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- 確認用：各テーブルの RLS 状態
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('employees','i_statuses','x_statuses','internals','externals',
--   'fukumeisho','self_trainings','manuals','committees','committee_members',
--   'committee_meetings','committee_notices','committee_meeting_reads',
--   'general_notices','seminars','seminar_monthly_views');

-- ============================================================
-- 緊急ロールバック（アプリが動かなくなった場合、下記を実行すると元の公開状態に戻ります）:
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY['employees','i_statuses','x_statuses','internals','externals',
--     'fukumeisho','self_trainings','manuals','committees','committee_members',
--     'committee_meetings','committee_notices','committee_meeting_reads',
--     'general_notices','seminars','seminar_monthly_views']
--   LOOP
--     EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
--   END LOOP;
-- END $$;
-- ============================================================
