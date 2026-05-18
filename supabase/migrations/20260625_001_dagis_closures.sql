-- Admin-defined closures (semestrar, utbildningsdagar, klämdagar utöver
-- de svenska röda dagarna). Each row covers a single date; multi-day
-- closures = multiple rows. Reason is shown to customers in the day modal.

create table public.dagis_closures (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index dagis_closures_date_idx on public.dagis_closures(date);

alter table public.dagis_closures enable row level security;

-- Anyone authenticated can read closures (customers + staff).
create policy "auth read closures" on public.dagis_closures
  for select to authenticated using (true);

-- Only admins/platschef can manage.
create policy "admins manage closures" on public.dagis_closures
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
