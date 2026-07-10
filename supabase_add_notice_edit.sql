-- お知らせの編集対応：配信予定日時を保存し、予約中のLINE配信を差し替えられるようにする
ALTER TABLE general_notices
  ADD COLUMN IF NOT EXISTS line_date date;
ALTER TABLE general_notices
  ADD COLUMN IF NOT EXISTS line_time text;
-- 配信キューに「どのお知らせの分か」を記録（編集時に未送信分だけ差し替えるため）
ALTER TABLE line_notification_queue
  ADD COLUMN IF NOT EXISTS ref_id text;
