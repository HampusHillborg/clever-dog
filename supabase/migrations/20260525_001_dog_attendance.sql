-- One row per (dog, date) when staff checks a dog in or out on that day.
-- Used by the mobile staff app to show "who's here today" + capture
-- arrival/departure timestamps.

create table public.dog_attendance (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  date date not null,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  checked_out_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (dog_id, date)
);

create index dog_attendance_date_idx on public.dog_attendance(date);

alter table public.dog_attendance enable row level security;

-- Staff (any admin_users row) can read + write attendance for any dog.
create policy "staff manage attendance" on public.dog_attendance
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Customers may see whether their own dog has been checked in today.
create policy "customers read own dog attendance" on public.dog_attendance
  for select to authenticated
  using (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );
