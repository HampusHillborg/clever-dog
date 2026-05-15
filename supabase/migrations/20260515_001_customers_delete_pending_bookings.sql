-- Allow a customer to withdraw their own pending booking request.
-- Without this, "Avbryt förfrågan" in the portal calendar silently no-ops
-- because RLS blocks the DELETE (admins-only "for all" policy).
create policy "customers delete own pending bookings" on public.bookings
  for delete to authenticated
  using (
    customer_id = public.current_customer_id()
    and status = 'pending'
  );
