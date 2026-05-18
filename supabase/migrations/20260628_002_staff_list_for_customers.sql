-- Customers don't have RLS access to the employees table (sensitive fields
-- like hire_date, position notes, etc.). Expose a minimal staff directory
-- — just name + role + email — via a SECURITY DEFINER function so the
-- customer-side "Personalen"-card works without leaking everything.

create or replace function public.staff_directory()
returns table (
  id uuid,
  name text,
  role text
)
language sql
security definer
set search_path = public
as $$
  select e.id, e.name, e.role
  from public.employees e
  where coalesce(e.is_active, true) = true
    and e.name is not null
  order by e.name;
$$;

grant execute on function public.staff_directory() to authenticated;
