-- Multi-owner stöd: åtkomst till bookings/messages går via dog_id-länken,
-- inte via customer_id-matchning. Mamma + pappa båda kopplade till samma
-- hund ser då varandras bokningar och konversationer.

-- 1. Helpers ----------------------------------------------------------------

-- Returnera alla customer_ids länkade till en hund.
create or replace function public.dog_co_owners(p_dog_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select customer_id
  from public.customer_dogs
  where dog_id = p_dog_id;
$$;
revoke execute on function public.dog_co_owners(uuid) from anon;
grant execute on function public.dog_co_owners(uuid) to authenticated;

-- Är inloggad kund (via current_customer_id) länkad till denna hund?
create or replace function public.customer_sees_dog(p_dog_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.customer_dogs
    where dog_id = p_dog_id
      and customer_id = public.current_customer_id()
  );
$$;
revoke execute on function public.customer_sees_dog(uuid) from anon;
grant execute on function public.customer_sees_dog(uuid) to authenticated;

-- 2. BOOKINGS — ersätt customer_id-baserade policies -------------------------

drop policy if exists "customers read own bookings" on public.bookings;
create policy "co-owners read bookings" on public.bookings
  for select to authenticated
  using (public.customer_sees_dog(dog_id) or public.is_admin_user());

drop policy if exists "customers insert own bookings" on public.bookings;
create policy "co-owners insert bookings" on public.bookings
  for insert to authenticated
  with check (
    public.customer_sees_dog(dog_id)
    and customer_id = public.current_customer_id()
  );

drop policy if exists "customers update own bookings" on public.bookings;
create policy "co-owners update bookings" on public.bookings
  for update to authenticated
  using (
    (public.customer_sees_dog(dog_id) and status in ('confirmed','pending'))
    or public.is_admin_user()
  )
  with check (public.customer_sees_dog(dog_id) or public.is_admin_user());

-- "admins manage bookings" finns redan från 20260513_002 — lämnas orörd.

-- 3. MESSAGES — ersätt customer_id-baserade policies, behåll legacy-fallback --

drop policy if exists "customers read own messages" on public.messages;
create policy "co-owners read messages" on public.messages
  for select to authenticated
  using (
    (dog_id is not null and public.customer_sees_dog(dog_id))
    or (dog_id is null and customer_id = public.current_customer_id())
    or public.is_admin_user()
  );

drop policy if exists "customers insert own messages" on public.messages;
create policy "co-owners insert messages" on public.messages
  for insert to authenticated
  with check (
    dog_id is not null
    and public.customer_sees_dog(dog_id)
    and customer_id = public.current_customer_id()
    and sender_role = 'customer'
    and sender_user_id = auth.uid()
  );

drop policy if exists "customers update read flag" on public.messages;
create policy "co-owners update read flag" on public.messages
  for update to authenticated
  using (
    (dog_id is not null and public.customer_sees_dog(dog_id))
    or (dog_id is null and customer_id = public.current_customer_id())
  )
  with check (
    (dog_id is not null and public.customer_sees_dog(dog_id))
    or (dog_id is null and customer_id = public.current_customer_id())
  );

-- "admins manage messages" finns redan från 20260513_002 — lämnas orörd.
