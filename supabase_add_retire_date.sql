-- 退職日フィールド追加
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS retire_date text DEFAULT NULL;
