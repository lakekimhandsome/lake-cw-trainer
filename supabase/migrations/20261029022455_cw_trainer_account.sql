create table public."cw-trainer_accounts" (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  training jsonb not null check (jsonb_typeof(training) = 'object'),
  revision bigint not null default 0 check (revision >= 0)
);
alter table public."cw-trainer_accounts" enable row level security;
revoke all on public."cw-trainer_accounts" from anon, authenticated;
grant select, insert, update on public."cw-trainer_accounts" to authenticated;
create policy "cw-trainer_select_own" on public."cw-trainer_accounts"
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cw-trainer_insert_own" on public."cw-trainer_accounts"
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cw-trainer_update_own" on public."cw-trainer_accounts"
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
