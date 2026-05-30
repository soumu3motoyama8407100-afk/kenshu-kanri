-- 退職者管理：is_activeカラム追加
-- SQL Editorで実行してください

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 既存の職員は全員アクティブに設定
UPDATE employees SET is_active = true WHERE is_active IS NULL;
