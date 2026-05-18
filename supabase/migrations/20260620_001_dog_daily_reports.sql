-- Daily report card per dog. Staff fills in throughout the day from the
-- mobile app; customer sees it as a card on Home and in Album archive.
-- All fields are nullable so partial reports work — the customer only
-- sees rows where at least one field is filled.

create table public.dog_daily_reports (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  date date not null,
  -- 'happy' | 'neutral' | 'rough'
  mood text check (mood in ('happy', 'neutral', 'rough')),
  -- 'all' | 'some' | 'none'
  food_eaten text check (food_eaten in ('all', 'some', 'none')),
  -- 'low' | 'normal' | 'high'
  activity_level text check (activity_level in ('low', 'normal', 'high')),
  pooped boolean,
  note text,
  posted_by uuid references auth.users(id) on delete set null,
  posted_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (dog_id, date)
);

create index dog_daily_reports_dog_date_idx
  on public.dog_daily_reports(dog_id, date desc);

alter table public.dog_daily_reports enable row level security;

create policy "staff manage daily reports" on public.dog_daily_reports
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "customers read own daily reports" on public.dog_daily_reports
  for select to authenticated
  using (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );
