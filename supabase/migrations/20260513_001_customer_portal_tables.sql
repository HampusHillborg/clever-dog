-- customers: en rad per hundägare som har/ska få konto
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null unique,
  email text not null unique,
  name text not null,
  phone text,
  address text,
  city text,
  personal_number text,
  invite_status text not null default 'not_invited'
    check (invite_status in ('not_invited','invited','accepted','disabled')),
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.customer_dogs (
  customer_id uuid not null references public.customers(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  is_primary_owner boolean default true,
  created_at timestamptz default now(),
  primary key (customer_id, dog_id)
);

create index idx_customer_dogs_dog on public.customer_dogs(dog_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  start_date date not null,
  end_date date not null,
  booking_type text not null
    check (booking_type in ('scheduled','extra','cancelled','boarding','single_day')),
  status text not null default 'confirmed'
    check (status in ('confirmed','pending','rejected','cancelled')),
  notes text,
  admin_response text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (end_date >= start_date)
);

create index idx_bookings_dog_date on public.bookings(dog_id, start_date);
create index idx_bookings_status on public.bookings(status) where status = 'pending';

create table public.recurring_schedule (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  active boolean default true,
  created_at timestamptz default now(),
  unique (dog_id, weekday)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  sender_role text not null check (sender_role in ('customer','staff')),
  sender_user_id uuid references auth.users(id),
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_messages_customer_created on public.messages(customer_id, created_at desc);
create index idx_messages_unread on public.messages(customer_id, is_read) where is_read = false;

alter table public.dogs add column if not exists photo_url text;
alter table public.dogs add column if not exists customer_notes text;

create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.update_updated_at_column();
create trigger trg_bookings_updated_at before update on public.bookings
  for each row execute function public.update_updated_at_column();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dog-photos',
  'dog-photos',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;
