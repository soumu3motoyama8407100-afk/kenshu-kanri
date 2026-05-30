-- =============================================
-- マニュアル管理システム Supabase セットアップ
-- =============================================
-- Supabaseダッシュボード → SQL Editor で実行してください

-- 1. manualsテーブル作成
CREATE TABLE IF NOT EXISTS manuals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  category    text NOT NULL,
  file_name   text NOT NULL,
  file_path   text NOT NULL,
  file_url    text NOT NULL,
  file_type   text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 2. Storageバケット作成（SQL Editorで実行）
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuals', 'manuals', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storageポリシー（誰でも読み取り可、認証不要）
CREATE POLICY "Public read manuals"
ON storage.objects FOR SELECT
USING (bucket_id = 'manuals');

CREATE POLICY "Allow upload manuals"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'manuals');

CREATE POLICY "Allow delete manuals"
ON storage.objects FOR DELETE
USING (bucket_id = 'manuals');

-- 4. manualsテーブルのRLS設定
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read manuals table"
ON manuals FOR SELECT USING (true);

CREATE POLICY "Allow insert manuals table"
ON manuals FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete manuals table"
ON manuals FOR DELETE USING (true);
