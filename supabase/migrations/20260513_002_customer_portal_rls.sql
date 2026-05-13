-- Helper-funktion: är inloggad user en admin/platschef/employee?
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;

revoke execute on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;

-- Helper-funktion: returnera inloggad customers.id
create or replace function public.current_customer_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select id from public.customers where auth_user_id = auth.uid() limit 1;
$$;

revoke execute on function public.current_customer_id() from anon;
grant execute on function public.current_customer_id() to authenticated;

-- ENABLE RLS
alter table public.customers enable row level security;
alter table public.customer_dogs enable row level security;
alter table public.bookings enable row level security;
alter table public.recurring_schedule enable row level security;
alter table public.messages enable row level security;

-- CUSTOMERS
create policy "customers read own" on public.customers
  for select to authenticated
  using (auth.uid() = auth_user_id or public.is_admin_user());

create policy "customers update own" on public.customers
  for update to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "admins manage customers" on public.customers
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- CUSTOMER_DOGS
create policy "customers read own dog links" on public.customer_dogs
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.is_admin_user());

create policy "admins manage customer dogs" on public.customer_dogs
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- BOOKINGS
create policy "customers read own bookings" on public.bookings
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.is_admin_user());

create policy "customers insert own bookings" on public.bookings
  for insert to authenticated
  with check (customer_id = public.current_customer_id());

create policy "customers update own bookings" on public.bookings
  for update to authenticated
  using (
    customer_id = public.current_customer_id()
    and status in ('confirmed','pending')
  )
  with check (customer_id = public.current_customer_id());

create policy "admins manage bookings" on public.bookings
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- RECURRING_SCHEDULE
create policy "customers read own schedule" on public.recurring_schedule
  for select to authenticated
  using (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
    or public.is_admin_user()
  );

create policy "admins manage recurring" on public.recurring_schedule
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- MESSAGES
create policy "customers read own messages" on public.messages
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.is_admin_user());

create policy "customers insert own messages" on public.messages
  for insert to authenticated
  with check (
    customer_id = public.current_customer_id()
    and sender_role = 'customer'
    and sender_user_id = auth.uid()
  );

create policy "customers update read flag" on public.messages
  for update to authenticated
  using (customer_id = public.current_customer_id())
  with check (customer_id = public.current_customer_id());

create policy "admins manage messages" on public.messages
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- STORAGE: dog-photos
-- Public read sker automatiskt via bucket public=true
create policy "Authenticated upload dog photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'dog-photos');

create policy "Authenticated update dog photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'dog-photos')
  with check (bucket_id = 'dog-photos');

create policy "Authenticated delete dog photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'dog-photos');
