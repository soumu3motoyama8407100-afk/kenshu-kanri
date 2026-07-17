-- 外部研修：復命書必須対象者リストを追加（内部研修と同じ仕組み）
ALTER TABLE externals
  ADD COLUMN IF NOT EXISTS required_emp_ids text[] DEFAULT '{}';
