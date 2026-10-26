-- Prepared migration only. Requires Supabase project SQL Editor permissions.
-- Existing access-code login is NOT Supabase Auth. Do not enable cloud upload
-- until authenticated account UI and two-account RLS verification are complete.
begin;
create table if not exists public.user_prefs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lot_type text not null check (lot_type in ('xa','la','gc','xgc')),
  prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(prefs)='object' and pg_column_size(prefs)<=262144),
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key(user_id,lot_type)
);
create table if not exists public.user_prediction_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lot_type text not null check (lot_type in ('xa','la','gc','xgc')),
  record_key text not null check (length(record_key) between 1 and 1024),
  record jsonb not null check (jsonb_typeof(record)='object' and pg_column_size(record)<=16384),
  updated_at timestamptz not null default now(),
  primary key(user_id,lot_type,record_key)
);
do $$
begin
  if exists(select 1 from pg_policies where schemaname='public'
    and tablename in ('user_prefs','user_prediction_records')
    and policyname not in ('own_preferences','own_prediction_records')) then
    raise exception 'Existing policies require review; migration stopped without removing data.';
  end if;
end $$;
revoke all on public.user_prefs,public.user_prediction_records from public;
alter table public.user_prefs enable row level security;
alter table public.user_prediction_records enable row level security;
revoke all on public.user_prefs,public.user_prediction_records from anon;
grant select,insert,update,delete on public.user_prefs,public.user_prediction_records to authenticated;
drop policy if exists own_preferences on public.user_prefs;
create policy own_preferences on public.user_prefs for all to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists own_prediction_records on public.user_prediction_records;
create policy own_prediction_records on public.user_prediction_records for all to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
notify pgrst,'reload schema';
commit;
