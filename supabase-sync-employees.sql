-- Trigger to automatically create employee entry when a user signs up
-- This replaces the previous function to also include employees table sync

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  name_from_email TEXT;
BEGIN
  -- Create entry in admin_users
  INSERT INTO public.admin_users (id, email, role)
  VALUES (NEW.id, NEW.email, 'employee');

  -- Create entry in employees
  -- Extract name from email (everything before @) and capitalize first letter
  -- This gives a reasonable default name that can be updated later
  name_from_email := split_part(NEW.email, '@', 1);
  name_from_email := upper(substring(name_from_email from 1 for 1)) || substring(name_from_email from 2);

  INSERT INTO public.employees (id, name, email, role, is_active)
  VALUES (
    NEW.id, 
    name_from_email, 
    NEW.email, 
    'employee', 
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is still active (it should be, but just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Backfill existing users who might be missing from employees table
-- Uncomment and run if needed, specifically for users with 'employee' role
/*
INSERT INTO public.employees (id, name, email, role, is_active)
SELECT 
  au.id,
  upper(substring(split_part(au.email, '@', 1) from 1 for 1)) || substring(split_part(au.email, '@', 1) from 2),
  au.email,
  au.role,
  true
FROM public.admin_users au
WHERE au.id NOT IN (SELECT id FROM public.employees)
AND au.role = 'employee';
*/
