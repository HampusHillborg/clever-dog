-- Track who/when/why an application was rejected.
-- Reason is shown to the customer in the rejection email and kept for admin history.
alter table public.applications
  add column if not exists rejection_reason text,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists rejected_at timestamptz;
