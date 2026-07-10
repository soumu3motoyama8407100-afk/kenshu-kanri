-- お知らせに締切日を追加（締切のあるお知らせを職員のお知らせタブに表示・残り日数計算に使用）
ALTER TABLE general_notices
  ADD COLUMN IF NOT EXISTS deadline date;
