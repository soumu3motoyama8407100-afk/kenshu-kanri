-- 役職フィールド追加
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS role_title text DEFAULT '';
