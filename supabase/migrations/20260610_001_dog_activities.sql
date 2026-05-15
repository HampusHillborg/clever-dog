-- Per-dog activity feed. Staff posts photo + optional caption from the
-- mobile app during the day; the customer sees it as an album on their
-- dog's portal page.

create table public.dog_activities (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  photo_url text,
  body text,
  posted_by uuid references auth.users(id) on delete set null,
  posted_by_name text,
  created_at timestamptz default now(),
  check (photo_url is not null or body is not null)
);

create index dog_activities_dog_created_idx
  on public.dog_activities(dog_id, created_at desc);

alter table public.dog_activities enable row level security;

-- Staff (any admin_users row) post and manage everything.
create policy "staff manage activities" on public.dog_activities
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Customers can read activities for any of their dogs.
create policy "customers read own dog activities" on public.dog_activities
  for select to authenticated
  using (
    dog_id in (
      select dog_id from public.customer_dogs
      where customer_id = public.current_customer_id()
    )
  );

-- Storage bucket for the photos. Public so customers can fetch by URL.
insert into storage.buckets (id, name, public)
values ('dog-activities', 'dog-activities', true)
on conflict (id) do update set public = true;

-- Storage policies. Read open to anon (URLs are unguessable UUID paths).
-- Write only by staff.
create policy "staff upload to dog-activities" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dog-activities' and public.is_admin_user());

create policy "staff delete from dog-activities" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dog-activities' and public.is_admin_user());
