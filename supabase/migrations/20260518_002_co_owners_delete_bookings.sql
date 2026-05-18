-- Co-owner-aware DELETE-policy på bookings. Fixar att co-owners kan
-- ta bort varandras pending bokningar, samma princip som SELECT/UPDATE
-- redan har via 20260518_001_co_owners_rls.sql.

drop policy if exists "customers delete own pending bookings" on public.bookings;

create policy "co-owners delete pending bookings" on public.bookings
  for delete to authenticated
  using (
    public.customer_sees_dog(dog_id)
    and status = 'pending'
  );

-- "admins manage bookings" från 20260513_002 täcker admin-delete redan.
