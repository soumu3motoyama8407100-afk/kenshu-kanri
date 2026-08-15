-- 復命書（アプリ内記入・Word出力）の保存用テーブル。Supabase の SQL Editor に貼り付けて Run を1回実行してください。
create table if not exists public.fukumeisho (
  id uuid primary key default gen_random_uuid(),
  emp_id       text not null,
  training_id  text not null,
  job          text default '',
  submit_date  text default '',
  body         text default '',
  updated_at   timestamptz default now(),
  unique (emp_id, training_id)
);

alter table public.fukumeisho enable row level security;

-- 既存テーブルと同様、アプリのキー（anon）で読み書きできるように許可
drop policy if exists fukumeisho_all on public.fukumeisho;
create policy fukumeisho_all on public.fukumeisho
  for all to anon, authenticated
  using (true) with check (true);
