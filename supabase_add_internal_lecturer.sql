-- 内部研修：講師欄を追加（詳細画面に時間・場所・講師を表示）
ALTER TABLE internals
  ADD COLUMN IF NOT EXISTS lecturer text;
