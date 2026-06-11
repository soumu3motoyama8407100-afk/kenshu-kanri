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

-- seminar_monthly_viewsテーブル（職員ごとの月別視聴・復命書チェック）
-- ymは "2026-06" 形式。動画が毎月更新されるため月単位で記録する
CREATE TABLE IF NOT EXISTS seminar_monthly_views (
  emp_id           text NOT NULL,
  seminar_id       text NOT NULL,
  ym               text NOT NULL,
  watched          boolean DEFAULT false,
  report_submitted boolean DEFAULT false,
  updated_at       timestamptz DEFAULT now(),
  PRIMARY KEY (emp_id, seminar_id, ym)
);

-- RLS設定
ALTER TABLE seminars ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminar_monthly_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read seminars" ON seminars;
DROP POLICY IF EXISTS "Allow insert seminars" ON seminars;
DROP POLICY IF EXISTS "Allow update seminars" ON seminars;
DROP POLICY IF EXISTS "Allow delete seminars" ON seminars;
DROP POLICY IF EXISTS "Allow all seminars" ON seminars;
CREATE POLICY "Allow all seminars" ON seminars
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all seminar_monthly_views" ON seminar_monthly_views;
CREATE POLICY "Allow all seminar_monthly_views" ON seminar_monthly_views
  FOR ALL USING (true) WITH CHECK (true);
