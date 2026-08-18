-- 必須研修（部署恒常）機能で使う2つの列を internals テーブルに追加します。
-- Supabase の SQL Editor に貼り付けて「Run」で1回だけ実行してください。
-- 既存の研修データには影響しません（デフォルト値が入るだけ）。

-- 1) 部署恒常の必須研修かどうかのフラグ
ALTER TABLE internals ADD COLUMN IF NOT EXISTS is_standing boolean DEFAULT false;

-- 2) 対象部署（この部署の在籍者に自動で必須表示。異動・入職者にも自動反映）
ALTER TABLE internals ADD COLUMN IF NOT EXISTS target_depts text[] DEFAULT '{}';

-- 3) 必須研修は開催日を持たないため、date 列を空(NULL)で保存できるようにする
ALTER TABLE internals ALTER COLUMN date DROP NOT NULL;
