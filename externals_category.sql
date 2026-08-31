-- 外部研修に「居宅研修」タブを追加するための category 列を externals に追加します。
-- Supabase の SQL Editor に貼り付けて「Run」で1回だけ実行してください。
-- 既存の外部研修はすべて category='外部' 扱いになります（従来どおり外部研修タブに表示）。

ALTER TABLE externals ADD COLUMN IF NOT EXISTS category text DEFAULT '外部';
