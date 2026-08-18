-- 外部研修の「受講せず（欠席）」機能で使う列を x_statuses テーブルに追加します。
-- Supabase の SQL Editor に貼り付けて「Run」で1回だけ実行してください。
-- 既存データには影響しません（既定は false＝受講扱い）。

-- 受講せず（当日参加できなかった）フラグ。true の人は復命書が不要になります
ALTER TABLE x_statuses ADD COLUMN IF NOT EXISTS absent boolean DEFAULT false;
