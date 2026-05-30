-- =============================================
-- Storage移行アップデート
-- =============================================
-- SQL Editorで実行してください

-- 1. externalsテーブルにStorage用カラム追加
ALTER TABLE externals
  ADD COLUMN IF NOT EXISTS file_url  text,
  ADD COLUMN IF NOT EXISTS file_path text;

-- 2. training-files Storageバケット作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-files', 'training-files', true)
ON CONFLICT (id) DO NOTHING;

-- 3. training-filesのStorageポリシー
CREATE POLICY "Public read training files"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-files');

CREATE POLICY "Allow upload training files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-files');

CREATE POLICY "Allow delete training files"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-files');
