-- =============================================
-- オンラインセミナー（リブドゥ等）機能 追加SQL
-- =============================================
-- Supabaseダッシュボード → SQL Editor で全文をそのまま実行してください
-- ※ 何度実行してもエラーになりません（作成済みの分はスキップ／置き換え）

-- seminarsテーブル（配信の登録）
CREATE TABLE IF NOT EXISTS seminars (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  date        date NOT NULL,
  video_url   text DEFAULT '',
  description text DEFAULT '',
  organizer   text DEFAULT 'リブドゥ',
  updated_at  timestamptz DEFAULT now()
);

-- RLS設定
ALTER TABLE seminars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read seminars" ON seminars;
DROP POLICY IF EXISTS "Allow insert seminars" ON seminars;
DROP POLICY IF EXISTS "Allow update seminars" ON seminars;
DROP POLICY IF EXISTS "Allow delete seminars" ON seminars;
DROP POLICY IF EXISTS "Allow all seminars" ON seminars;
CREATE POLICY "Allow all seminars" ON seminars
  FOR ALL USING (true) WITH CHECK (true);
