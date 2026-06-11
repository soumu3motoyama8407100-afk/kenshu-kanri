-- =============================================
-- オンラインセミナー（リブドゥ等）機能 追加SQL
-- =============================================
-- Supabaseダッシュボード → SQL Editor で全文をそのまま実行してください
-- ※ 何度実行してもエラーになりません（作成済みの分はスキップ／置き換え）

-- 1. seminarsテーブル（配信回のマスタ）
CREATE TABLE IF NOT EXISTS seminars (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  date        date NOT NULL,
  video_url   text DEFAULT '',
  description text DEFAULT '',
  organizer   text DEFAULT 'リブドゥ',
  updated_at  timestamptz DEFAULT now()
);

-- 2. seminar_viewsテーブル（職員ごとの視聴状況）
CREATE TABLE IF NOT EXISTS seminar_views (
  emp_id      text NOT NULL,
  seminar_id  text NOT NULL,
  watched     boolean DEFAULT false,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (emp_id, seminar_id)
);

-- 3. RLS設定
ALTER TABLE seminars ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminar_views ENABLE ROW LEVEL SECURITY;

-- 4. ポリシー（既存があれば一旦削除してから作成）
DROP POLICY IF EXISTS "Public read seminars" ON seminars;
DROP POLICY IF EXISTS "Allow insert seminars" ON seminars;
DROP POLICY IF EXISTS "Allow update seminars" ON seminars;
DROP POLICY IF EXISTS "Allow delete seminars" ON seminars;
DROP POLICY IF EXISTS "Allow all seminars" ON seminars;
CREATE POLICY "Allow all seminars" ON seminars
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read seminar_views" ON seminar_views;
DROP POLICY IF EXISTS "Allow insert seminar_views" ON seminar_views;
DROP POLICY IF EXISTS "Allow update seminar_views" ON seminar_views;
DROP POLICY IF EXISTS "Allow delete seminar_views" ON seminar_views;
DROP POLICY IF EXISTS "Allow all seminar_views" ON seminar_views;
CREATE POLICY "Allow all seminar_views" ON seminar_views
  FOR ALL USING (true) WITH CHECK (true);
