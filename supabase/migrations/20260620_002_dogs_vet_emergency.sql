-- Vet contact, emergency contact, and acute medical notes on each dog.
-- Surfaced prominently on the admin's DogInfoModal (red "akut"-card) so
-- staff sees critical info before any other detail.
alter table public.dogs
  add column if not exists vet_name text,
  add column if not exists vet_phone text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists medical_notes text;
