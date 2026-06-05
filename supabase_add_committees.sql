-- =============================================
-- 委員会管理機能 Supabase セットアップ
-- Supabaseダッシュボード → SQL Editor で実行してください
-- =============================================

-- 1. 委員会マスタテーブル
CREATE TABLE IF NOT EXISTS committees (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text DEFAULT '',
  chair_emp_id text NOT NULL DEFAULT '',
  color       text DEFAULT '#C89A55',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. 委員会メンバーテーブル
CREATE TABLE IF NOT EXISTS committee_members (
  committee_id text NOT NULL,
  emp_id       text NOT NULL,
  PRIMARY KEY (committee_id, emp_id)
);

-- 3. 委員会開催予定テーブル
CREATE TABLE IF NOT EXISTS committee_meetings (
  id             text PRIMARY KEY,
  committee_id   text NOT NULL,
  scheduled_date date NOT NULL,
  start_time     text DEFAULT '',
  location       text DEFAULT '',
  agenda         text DEFAULT '',
  notes          text DEFAULT '',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- 4. 既読管理テーブル
CREATE TABLE IF NOT EXISTS committee_meeting_reads (
  meeting_id text NOT NULL,
  emp_id     text NOT NULL,
  read_at    timestamptz DEFAULT now(),
  PRIMARY KEY (meeting_id, emp_id)
);

-- RLS有効化
ALTER TABLE committees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_meetings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_meeting_reads ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全操作許可・アプリ側で権限制御）
CREATE POLICY "committees_all"              ON committees              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "committee_members_all"       ON committee_members       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "committee_meetings_all"      ON committee_meetings      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "committee_meeting_reads_all" ON committee_meeting_reads FOR ALL USING (true) WITH CHECK (true);

-- 初期データ（主要委員会）
-- ※ chair_emp_id は後から管理者画面で設定してください
INSERT INTO committees (id, name, description, chair_emp_id, color) VALUES
  ('C001', '感染対策委員会',           '院内感染予防・対策の立案および実施',                       '', '#dc2626'),
  ('C002', '褥瘡対策委員会',           '褥瘡の予防・早期発見・治療方針の検討',                     '', '#7c3aed'),
  ('C003', '身体拘束廃止・虐待防止委員会', '身体拘束の適正化と虐待防止の取組み',                   '', '#0369a1'),
  ('C004', '事故防止委員会',           'ヒヤリハット・事故の分析と再発防止策の検討',               '', '#d97706'),
  ('C005', '栄養委員会',               '利用者の栄養管理・食事提供の改善',                         '', '#16a34a'),
  ('C006', '研修委員会',               '職員研修計画の立案・実施・評価',                           '', '#C89A55'),
  ('C007', '安全衛生委員会',           '職員の労働安全衛生・職場環境改善',                         '', '#0891b2'),
  ('C008', 'BCP委員会',               '事業継続計画の策定・見直し・訓練の実施',                   '', '#6b7280'),
  ('C009', '倫理委員会',               'ケアの倫理的課題の検討と職員への啓発',                     '', '#9333ea'),
  ('C010', 'ケアの質向上委員会',       'サービスの質評価・改善計画の立案',                         '', '#059669')
ON CONFLICT (id) DO NOTHING;
