-- 複数部署管理対応
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS managed_depts text[] DEFAULT '{}';
