-- Maps an authenticated user to their native push tokens (FCM / APNs).
-- Used by the send-notification edge function to fan out a push for
-- booking decisions, staff messages, etc.

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, token)
);

create index device_tokens_user_id_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

-- Users may insert/read/update/delete their own token rows.
create policy "users manage own tokens" on public.device_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins (and staff with admin role) can read any user's tokens. This
-- is used only for diagnostics; the edge function uses service role and
-- bypasses RLS anyway.
create policy "admins read all tokens" on public.device_tokens
  for select to authenticated
  using (public.is_admin_user());
