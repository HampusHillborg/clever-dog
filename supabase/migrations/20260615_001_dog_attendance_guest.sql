-- Allow free-text guest entries on the daily attendance board for dogs
-- that aren't in our system yet (walk-ins, trial days, visitors).
alter table public.dog_attendance
  alter column dog_id drop not null;

alter table public.dog_attendance
  add column if not exists guest_name text,
  add column if not exists guest_owner text;

-- At least one of dog_id or guest_name must be present.
alter table public.dog_attendance
  add constraint dog_attendance_id_or_guest
  check (dog_id is not null or guest_name is not null);
