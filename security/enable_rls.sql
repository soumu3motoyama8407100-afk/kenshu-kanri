-- ============================================================
-- 【最終段階（施錠）用】まだ実行しないでください。
-- 段階2（ログインを正式認証に切替）を本番反映し、全ロールでログイン確認できたあとに実行します。
--
-- 効果：対象16テーブルの既存ポリシーを全て削除し、RLSを有効化して
--       「ログイン済み（authenticated）のときだけ全操作可」に統一します。
--       これにより {public} Allow all（＝公開状態）が消え、未ログインの第三者は
--       いっさいアクセスできなくなります（＝本当の対策・警告解消）。
--
-- 権限の出し分け（管理者/主任/一般）はアプリ側で行うため、RLSはシンプルに保ちます。
-- 過去の作りかけ（profiles参照のmanager判定ポリシー）も、この一掃で消えます。
-- ============================================================

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employees','i_statuses','x_statuses','internals','externals',
    'fukumeisho','self_trainings','manuals','committees','committee_members',
    'committee_meetings','committee_notices','committee_meeting_reads',
    'general_notices','seminars','seminar_monthly_views'
  ]
  LOOP
    -- このテーブルの既存ポリシーを全削除（public allow-all も含む）
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I;', p.policyname, t);
    END LOOP;
    -- RLS 有効化＋「ログイン済みなら全操作可」の1本に統一
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- PostgREST に反映
NOTIFY pgrst, 'reload schema';

-- 確認：各テーブルのRLS状態とポリシー
-- SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace
--   AND relname = ANY(ARRAY['employees','i_statuses','x_statuses','internals','externals',
--   'fukumeisho','self_trainings','manuals','committees','committee_members',
--   'committee_meetings','committee_notices','committee_meeting_reads',
--   'general_notices','seminars','seminar_monthly_views']);
-- SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename;

-- ============================================================
-- 緊急ロールバック（万一アプリが動かない場合、公開状態に戻して復旧）:
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY['employees','i_statuses','x_statuses','internals','externals',
--     'fukumeisho','self_trainings','manuals','committees','committee_members',
--     'committee_meetings','committee_notices','committee_meeting_reads',
--     'general_notices','seminars','seminar_monthly_views']
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%I;', t);
--     EXECUTE format('CREATE POLICY allow_all ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', t);
--   END LOOP;
-- END $$;
-- ※完全に元へ戻すなら各テーブル ALTER TABLE ... DISABLE ROW LEVEL SECURITY; も可。
-- ============================================================
