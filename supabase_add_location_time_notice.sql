-- 内部研修に場所・時間を追加
ALTER TABLE internals
  ADD COLUMN IF NOT EXISTS location   text DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_time text DEFAULT '';

-- 外部研修に受講決定通知PDFを追加
ALTER TABLE externals
  ADD COLUMN IF NOT EXISTS notice_file_url  text,
  ADD COLUMN IF NOT EXISTS notice_file_path text,
  ADD COLUMN IF NOT EXISTS notice_file_name text;
