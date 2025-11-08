-- Fixes for Staff Scheduling Schema
-- Run this in your Supabase SQL Editor
-- SÄKERT ATT KÖRA FLERA GÅNGER

-- ============================================================================
-- 1. Uppdatera admin_users för att stödja 'platschef' roll
-- ============================================================================

-- Ta bort gammalt CHECK constraint om det finns
ALTER TABLE admin_users 
DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Lägg till nytt CHECK constraint som inkluderar 'platschef'
ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('admin', 'employee', 'platschef'));

-- ============================================================================
-- 2. Skapa/uppdatera trigger för att automatiskt skapa admin_users när auth.users skapas
-- ============================================================================

-- Funktion för att skapa admin_users entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_users (id, email, role)
  VALUES (NEW.id, NEW.email, 'employee')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ta bort gammal trigger om den finns
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Skapa trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. Lägg till triggers för updated_at på tabellerna
-- ============================================================================

-- Funktion för att uppdatera updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers för employees
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Triggers för staff_schedules
DROP TRIGGER IF EXISTS update_staff_schedules_updated_at ON staff_schedules;
CREATE TRIGGER update_staff_schedules_updated_at
  BEFORE UPDATE ON staff_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Triggers för staff_absences
DROP TRIGGER IF EXISTS update_staff_absences_updated_at ON staff_absences;
CREATE TRIGGER update_staff_absences_updated_at
  BEFORE UPDATE ON staff_absences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 4. Verifiera att alla permissions är korrekta
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_absences TO authenticated;
