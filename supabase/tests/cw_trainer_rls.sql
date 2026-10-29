-- Run against caferadar. All test records are rolled back.
begin;
select set_config('cw_test.owner', (select id::text from auth.users limit 1), true);
select set_config('request.jwt.claim.sub', current_setting('cw_test.owner'), true);
set local role authenticated;
insert into public."cw-trainer_accounts"(user_id,settings,training) values (auth.uid(),'{}','{}');
do $$ begin
  if (select count(*) from public."cw-trainer_accounts") <> 1 then raise exception 'own read failed'; end if;
  update public."cw-trainer_accounts" set revision=1 where user_id=auth.uid() and revision=0;
  if not found then raise exception 'own CAS write failed'; end if;
  update public."cw-trainer_accounts" set revision=2 where user_id=auth.uid() and revision=0;
  if found then raise exception 'stale CAS write succeeded'; end if;
  begin
    insert into public."cw-trainer_accounts"(user_id,settings,training) values (gen_random_uuid(),'{}','{}');
    raise exception 'cross-user insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public."cw-trainer_accounts" set user_id=gen_random_uuid() where user_id=auth.uid();
    raise exception 'ownership transfer succeeded';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
do $$ begin
  if (select count(*) from public."cw-trainer_accounts") <> 0 then raise exception 'cross-user read succeeded'; end if;
  update public."cw-trainer_accounts" set revision=3;
  if found then raise exception 'cross-user update succeeded'; end if;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public."cw-trainer_accounts"','select') then raise exception 'anon access granted'; end if;
  if has_table_privilege('authenticated','public."cw-trainer_accounts"','delete') then raise exception 'delete access granted'; end if;
end $$;
rollback;
