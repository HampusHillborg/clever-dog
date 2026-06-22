-- enforce_booking_capacity() anropade day_capacity_for_date(date, location) och
-- booked_dogs_on_date(date, location) — 2-args-versionerna med location togs
-- bort i drop_location_columns_and_functions, så varje confirmed extra/enstaka-
-- dag-bokning kraschade med "function ... (date, unknown) does not exist".
-- Uppdatera till de kvarvarande 1-args-versionerna.
CREATE OR REPLACE FUNCTION public.enforce_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  cap_hard int;
  cur_count int;
begin
  if NEW.booking_type not in ('extra', 'single_day') then return NEW; end if;
  if NEW.status <> 'confirmed' then return NEW; end if;

  select hard_limit into cap_hard
  from public.day_capacity_for_date(NEW.start_date);

  if cap_hard is null then return NEW; end if;

  cur_count := public.booked_dogs_on_date(NEW.start_date);

  if cur_count >= cap_hard then
    raise exception 'Dagiset är fullt detta datum (% / % platser bokade). Försök en annan dag.', cur_count, cap_hard
      using errcode = 'check_violation';
  end if;
  return NEW;
end;
$function$;
