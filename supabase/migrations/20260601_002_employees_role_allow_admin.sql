-- Allow 'admin' in employees.role so admin_users with admin role can have
-- a corresponding employees record (and show up in the staff list).
alter table public.employees drop constraint if exists employees_role_check;
alter table public.employees
  add constraint employees_role_check
  check (role in ('employee','platschef','admin'));
