-- Kunder kunde inte ta bort egna vaccinationer: det fanns ingen DELETE-policy,
-- så raderingen blockerades tyst av RLS ("inget händer"). Lägg till en.
DROP POLICY IF EXISTS "customers delete own vaccinations" ON public.dog_vaccinations;
CREATE POLICY "customers delete own vaccinations"
  ON public.dog_vaccinations
  FOR DELETE
  TO authenticated
  USING (
    dog_id IN (
      SELECT customer_dogs.dog_id
      FROM customer_dogs
      WHERE customer_dogs.customer_id = current_customer_id()
    )
  );
