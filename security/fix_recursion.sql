-- 【今すぐ実行OK・安全】employees の無限再帰(42P17)の原因になっている、
-- 過去の作りかけ authenticated ポリシー（profiles参照・manager判定）を削除します。
-- 各テーブルには {public} Allow all ポリシーが残るため、今のアプリ動作は変わりません。

DROP POLICY IF EXISTS employees_write_manager ON public.employees;
DROP POLICY IF EXISTS employees_select        ON public.employees;
DROP POLICY IF EXISTS externals_write_manager ON public.externals;
DROP POLICY IF EXISTS externals_select        ON public.externals;
DROP POLICY IF EXISTS internals_write_manager ON public.internals;
DROP POLICY IF EXISTS internals_select        ON public.internals;
DROP POLICY IF EXISTS i_statuses_insert_own   ON public.i_statuses;
DROP POLICY IF EXISTS i_statuses_select       ON public.i_statuses;
DROP POLICY IF EXISTS i_statuses_update       ON public.i_statuses;
DROP POLICY IF EXISTS x_statuses_insert_own   ON public.x_statuses;
DROP POLICY IF EXISTS x_statuses_select       ON public.x_statuses;
DROP POLICY IF EXISTS x_statuses_update_manager ON public.x_statuses;
