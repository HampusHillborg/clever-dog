-- Allow multiple custom ("other") vaccinations per dog while still keeping
-- the three standard types unique. The old UNIQUE(dog_id, vaccine_type)
-- collapsed every "other" row into one and broke editing/deleting them.
ALTER TABLE public.dog_vaccinations
  DROP CONSTRAINT IF EXISTS dog_vaccinations_dog_id_vaccine_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS dog_vaccinations_dog_standard_type_uniq
  ON public.dog_vaccinations (dog_id, vaccine_type)
  WHERE vaccine_type <> 'other';
