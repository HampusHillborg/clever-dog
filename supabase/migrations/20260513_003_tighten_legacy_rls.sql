-- DOGS
drop policy if exists "Allow all operations" on public.dogs;

create policy "admins manage all dogs" on public.dogs
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "customers read own dogs" on public.dogs
  for select to authenticated
  using (
    id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );

create policy "customers update own dogs limited" on public.dogs
  for update to authenticated
  using (
    id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  )
  with check (
    id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );

-- BOARDING_RECORDS
drop policy if exists "Allow all operations" on public.boarding_records;

create policy "admins manage boarding records" on public.boarding_records
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- PLANNING_HISTORY
drop policy if exists "Allow all operations" on public.planning_history;

create policy "admins manage planning" on public.planning_history
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- BOX_SETTINGS
drop policy if exists "Allow all operations" on public.box_settings;

create policy "admins manage box settings" on public.box_settings
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Säkerhets-fixar
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.update_meetings_updated_at() set search_path = public, pg_temp;
alter function public.update_applications_updated_at() set search_path = public, pg_temp;
alter function public.get_user_role(uuid) set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
revoke execute on function public.get_user_role(uuid) from anon;
