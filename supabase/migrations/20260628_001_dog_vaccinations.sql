-- One row per (dog, vaccine type). Admin sets expiry; customer reads.
-- Customer can update if they want (they may have current vet records),
-- but they can't fake it for someone else's dog because RLS restricts to
-- their own customer_dogs link.

create table public.dog_vaccinations (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  -- 'rabies' | 'dhppi' (valpsjuka/hepatit/parvo/parainfluensa) | 'kennel_cough' | 'other'
  vaccine_type text not null check (vaccine_type in ('rabies','dhppi','kennel_cough','other')),
  label text,                -- displayed to customer if type = 'other'
  given_on date,
  expires_on date not null,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (dog_id, vaccine_type)
);

create index dog_vaccinations_dog_idx on public.dog_vaccinations(dog_id);
create index dog_vaccinations_expires_idx on public.dog_vaccinations(expires_on);

alter table public.dog_vaccinations enable row level security;

create policy "staff manage vaccinations" on public.dog_vaccinations
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "customers read own vaccinations" on public.dog_vaccinations
  for select to authenticated
  using (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );

create policy "customers update own vaccinations" on public.dog_vaccinations
  for update to authenticated
  using (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  )
  with check (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );

create policy "customers insert own vaccinations" on public.dog_vaccinations
  for insert to authenticated
  with check (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );
