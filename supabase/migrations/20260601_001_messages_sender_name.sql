-- Capture the staff member's display name at send time so the customer
-- can see "Hampus" / "Anna" etc. without needing read access to the
-- employees table (which is admin-only).
alter table public.messages
  add column if not exists sender_name text;
