-- 内部研修：復命書必須対象者リスト追加
ALTER TABLE internals
  ADD COLUMN IF NOT EXISTS required_emp_ids text[] DEFAULT '{}';
