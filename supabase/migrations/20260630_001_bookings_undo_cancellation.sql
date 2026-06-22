-- Allow co-owners to delete their own cancelled bookings (not just pending).
-- "Ångra avbokning" deletes the cancelled booking row so the day frees up
-- again; the old policy only allowed deleting status='pending', which silently
-- blocked undo of cancellations and left the day un-bookable.
DROP POLICY IF EXISTS "co-owners delete pending bookings" ON public.bookings;
CREATE POLICY "co-owners delete pending or cancelled bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (
    customer_sees_dog(dog_id)
    AND status = ANY (ARRAY['pending'::text, 'cancelled'::text])
  );
