-- 外部研修の「2日間セット（両日必須）」機能で使う列を externals テーブルに追加します。
-- Supabase の SQL Editor に貼り付けて「Run」で1回だけ実行してください。
-- 既存の外部研修データには影響しません（空欄=単日として従来どおり表示されます）。

-- 実施日②（2日にわたる研修の2日目。空なら単日研修）
ALTER TABLE externals ADD COLUMN IF NOT EXISTS date2 date;
