-- 職員の自己学習記録（管理者は関与しない。人事考課ポイントの対象外・参考記録）
CREATE TABLE IF NOT EXISTS self_trainings (
  id text PRIMARY KEY,
  emp_id text NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  time text DEFAULT '',
  location text DEFAULT '',
  report_submitted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
