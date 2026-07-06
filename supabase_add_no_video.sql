-- 内部研修：動画なしフラグ追加（視聴/未視聴を職員画面に表示しない）
ALTER TABLE internals
  ADD COLUMN IF NOT EXISTS no_video boolean DEFAULT false;
