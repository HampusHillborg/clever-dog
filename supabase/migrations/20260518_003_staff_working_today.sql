create or replace function public.staff_working_today(loc text default 'staffanstorp')
returns table (name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct e.name
  from public.staff_schedules s
  join public.employees e on e.id = s.employee_id
  where s.date = current_date
    and lower(s.location) = lower(loc)
  order by e.name;
$$;
revoke execute on function public.staff_working_today(text) from anon;
grant execute on function public.staff_working_today(text) to authenticated;
