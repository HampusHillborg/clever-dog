-- Drop location concept from the schema.
-- Business consolidated to a single physical location (Staffanstorp),
-- so location columns and per-location keys are dead weight.

-- 1. Drop SQL functions that reference location
DROP FUNCTION IF EXISTS public.booked_dogs_on_date(date, text);
DROP FUNCTION IF EXISTS public.day_capacity_for_date(date, text);
DROP FUNCTION IF EXISTS public.day_capacity_overview(date, date, text);
DROP FUNCTION IF EXISTS public.staff_working_today(text);

-- 2. Dedupe rows where location was part of the key.
-- Keep only staffanstorp rows (or first row if no staffanstorp).
DELETE FROM public.box_settings WHERE location <> 'staffanstorp';
DELETE FROM public.location_settings WHERE location <> 'staffanstorp';
DELETE FROM public.day_capacity_defaults WHERE location <> 'staffanstorp';
DELETE FROM public.day_capacity_overrides WHERE location <> 'staffanstorp';
DELETE FROM public.planning_history WHERE location <> 'staffanstorp';
DELETE FROM public.staff_schedules WHERE location <> 'staffanstorp';

-- 3. Drop primary keys / unique constraints that include location
ALTER TABLE public.box_settings DROP CONSTRAINT IF EXISTS box_settings_location_key;
ALTER TABLE public.day_capacity_defaults DROP CONSTRAINT IF EXISTS day_capacity_defaults_pkey;
ALTER TABLE public.day_capacity_overrides DROP CONSTRAINT IF EXISTS day_capacity_overrides_pkey;
ALTER TABLE public.location_settings DROP CONSTRAINT IF EXISTS location_settings_pkey;
ALTER TABLE public.planning_history DROP CONSTRAINT IF EXISTS planning_history_date_location_key;
ALTER TABLE public.staff_schedules DROP CONSTRAINT IF EXISTS staff_schedules_employee_id_date_start_time_location_key;
ALTER TABLE public.staff_schedules DROP CONSTRAINT IF EXISTS staff_schedules_unique;

-- 4. Drop the columns
ALTER TABLE public.applications DROP COLUMN IF EXISTS location;
ALTER TABLE public.boarding_records DROP COLUMN IF EXISTS location;
ALTER TABLE public.box_settings DROP COLUMN IF EXISTS location;
ALTER TABLE public.day_capacity_defaults DROP COLUMN IF EXISTS location;
ALTER TABLE public.day_capacity_overrides DROP COLUMN IF EXISTS location;
ALTER TABLE public.dogs DROP COLUMN IF EXISTS locations;
ALTER TABLE public.employees DROP COLUMN IF EXISTS location;
ALTER TABLE public.location_settings DROP COLUMN IF EXISTS location;
ALTER TABLE public.meetings DROP COLUMN IF EXISTS location;
ALTER TABLE public.planning_history DROP COLUMN IF EXISTS location;
ALTER TABLE public.staff_schedules DROP COLUMN IF EXISTS location;

-- 5. Re-add primary keys / uniques without location
ALTER TABLE public.day_capacity_defaults ADD PRIMARY KEY (weekday);
ALTER TABLE public.day_capacity_overrides ADD PRIMARY KEY (date);
ALTER TABLE public.planning_history ADD CONSTRAINT planning_history_date_key UNIQUE (date);
ALTER TABLE public.staff_schedules ADD CONSTRAINT staff_schedules_unique UNIQUE (employee_id, date, start_time);

-- location_settings and box_settings are now intended as singleton tables.
-- We don't enforce that at the DB level (would require an extra column), but the
-- application only writes/reads one row.

-- 6. Recreate the SQL functions without location parameter
CREATE OR REPLACE FUNCTION public.booked_dogs_on_date(p_date date)
RETURNS int LANGUAGE sql STABLE AS $$
  with
    wd as (select ((extract(isodow from p_date)::int) - 1) as weekday),
    counts_boarding as (
      select coalesce(count_boarding_in_dagis, false) as include
      from public.location_settings
      limit 1
    ),
    recurring_dogs as (
      select rs.dog_id
      from public.recurring_schedule rs
      join public.dogs d on d.id = rs.dog_id
      where rs.active = true
        and d.is_active = true
        and rs.weekday = (select weekday from wd)
        and not exists (
          select 1 from public.bookings b
          where b.dog_id = rs.dog_id
            and p_date between b.start_date and b.end_date
            and (b.booking_type = 'cancelled' or b.status = 'cancelled')
        )
    ),
    extra_dogs as (
      select dog_id
      from public.bookings
      where p_date between start_date and end_date
        and booking_type in ('extra', 'single_day')
        and status = 'confirmed'
    ),
    boarding_dogs as (
      select dog_id
      from public.bookings
      where p_date between start_date and end_date
        and booking_type = 'boarding'
        and status = 'confirmed'
        and (select include from counts_boarding)
    ),
    all_dogs as (
      select dog_id from recurring_dogs
      union
      select dog_id from extra_dogs
      union
      select dog_id from boarding_dogs
    )
  select count(*)::int from all_dogs;
$$;

CREATE OR REPLACE FUNCTION public.day_capacity_for_date(p_date date)
RETURNS TABLE(soft_limit int, hard_limit int) LANGUAGE sql STABLE AS $$
  select
    coalesce(o.soft_limit, dft.soft_limit) as soft_limit,
    coalesce(o.hard_limit, dft.hard_limit) as hard_limit
  from (select 1) x
  left join public.day_capacity_overrides o
    on o.date = p_date
  left join public.day_capacity_defaults dft
    on dft.weekday = ((extract(isodow from p_date)::int) - 1);
$$;

CREATE OR REPLACE FUNCTION public.day_capacity_overview(p_start date, p_end date)
RETURNS TABLE(date date, booked int, soft_limit int, hard_limit int) LANGUAGE sql STABLE AS $$
  select
    d::date as date,
    public.booked_dogs_on_date(d::date) as booked,
    cap.soft_limit,
    cap.hard_limit
  from generate_series(p_start, p_end, interval '1 day') d
  cross join lateral public.day_capacity_for_date(d::date) cap;
$$;

CREATE OR REPLACE FUNCTION public.staff_working_today()
RETURNS TABLE(name text) LANGUAGE sql STABLE AS $$
  select distinct e.name
  from public.staff_schedules s
  join public.employees e on e.id = s.employee_id
  where s.date = current_date
  order by e.name;
$$;
