-- =============================================
-- 【重要修正】アクセス権（RLSポリシー）の一括整備
-- =============================================
-- 症状：内部研修・外部研修・参加/復命書チェックが保存されない、職員に表示されない
-- 原因：internals / externals / i_statuses / x_statuses 等にRLSポリシーが無く、
--       アプリから読み書きできない状態だったため
--
-- Supabaseダッシュボード → SQL Editor で全文をそのまま実行してください
-- ※ 何度実行してもエラーになりません
-- ※ DROP POLICYはアクセス権ルールの作り直しのみで、データは削除しません

-- 内部研修
ALTER TABLE internals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all internals" ON internals;
CREATE POLICY "Allow all internals" ON internals
  FOR ALL USING (true) WITH CHECK (true);

-- 外部研修
ALTER TABLE externals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all externals" ON externals;
CREATE POLICY "Allow all externals" ON externals
  FOR ALL USING (true) WITH CHECK (true);

-- 内部研修の参加・復命書チェック
ALTER TABLE i_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all i_statuses" ON i_statuses;
CREATE POLICY "Allow all i_statuses" ON i_statuses
  FOR ALL USING (true) WITH CHECK (true);

-- 外部研修の受講・復命書チェック
ALTER TABLE x_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all x_statuses" ON x_statuses;
CREATE POLICY "Allow all x_statuses" ON x_statuses
  FOR ALL USING (true) WITH CHECK (true);

-- マニュアル
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all manuals" ON manuals;
CREATE POLICY "Allow all manuals" ON manuals
  FOR ALL USING (true) WITH CHECK (true);

-- 委員会関連（念のため整備）
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all committees" ON committees;
CREATE POLICY "Allow all committees" ON committees
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all committee_members" ON committee_members;
CREATE POLICY "Allow all committee_members" ON committee_members
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE committee_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all committee_meetings" ON committee_meetings;
CREATE POLICY "Allow all committee_meetings" ON committee_meetings
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE committee_meeting_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all committee_meeting_reads" ON committee_meeting_reads;
CREATE POLICY "Allow all committee_meeting_reads" ON committee_meeting_reads
  FOR ALL USING (true) WITH CHECK (true);

-- 委員会お知らせ（テーブル自体が無かったため作成）
CREATE TABLE IF NOT EXISTS committee_notices (
  id           text PRIMARY KEY,
  committee_id text NOT NULL,
  title        text NOT NULL,
  body         text DEFAULT '',
  posted_by    text DEFAULT '',
  is_public    boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE committee_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all committee_notices" ON committee_notices;
CREATE POLICY "Allow all committee_notices" ON committee_notices
  FOR ALL USING (true) WITH CHECK (true);
