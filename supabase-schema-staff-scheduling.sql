-- Staff Scheduling Schema for Clever Dog Admin Panel
-- Run this in your Supabase SQL Editor

-- Employees table - extends admin_users with additional employee information
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  location TEXT CHECK (location IN ('malmo', 'staffanstorp')),
  role TEXT CHECK (role IN ('employee', 'platschef')) DEFAULT 'employee',
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff schedules table
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff absences table (for employees to report sickness/absence)
CREATE TABLE IF NOT EXISTS staff_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sick', 'vacation', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_location ON employees(location);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_employee_id ON staff_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(date);
CREATE INDEX IF NOT EXISTS idx_staff_absences_employee_id ON staff_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_absences_status ON staff_absences(status);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_absences ENABLE ROW LEVEL SECURITY;

-- Policies for employees table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "Admin and platschef can view all employees" ON employees;
DROP POLICY IF EXISTS "Admin and platschef can manage employees" ON employees;

-- Employees can view their own data
CREATE POLICY "Employees can view their own data"
  ON employees
  FOR SELECT
  USING (auth.uid() = id);

-- Admin and platschef can view all employees
CREATE POLICY "Admin and platschef can view all employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Admin and platschef can insert/update employees
CREATE POLICY "Admin and platschef can manage employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Policies for staff_schedules table
DROP POLICY IF EXISTS "Employees can view their own schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Admin and platschef can manage all schedules" ON staff_schedules;

-- Employees can view their own schedules
CREATE POLICY "Employees can view their own schedules"
  ON staff_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = staff_schedules.employee_id 
      AND employees.id = auth.uid()
    )
  );

-- Admin and platschef can manage all schedules
CREATE POLICY "Admin and platschef can manage all schedules"
  ON staff_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Policies for staff_absences table
-- IMPORTANT: Split SELECT and INSERT into separate policies (PostgreSQL requirement)
DROP POLICY IF EXISTS "Employees can view their own absences" ON staff_absences;
DROP POLICY IF EXISTS "Employees can create their own absences" ON staff_absences;
DROP POLICY IF EXISTS "Employees can update their own pending absences" ON staff_absences;
DROP POLICY IF EXISTS "Admin and platschef can manage all absences" ON staff_absences;

-- Employees can view their own absences
CREATE POLICY "Employees can view their own absences"
  ON staff_absences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = staff_absences.employee_id 
      AND employees.id = auth.uid()
    )
  );

-- Employees can create their own absences
CREATE POLICY "Employees can create their own absences"
  ON staff_absences
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = staff_absences.employee_id 
      AND employees.id = auth.uid()
    )
  );

-- Employees can update their own pending absences
CREATE POLICY "Employees can update their own pending absences"
  ON staff_absences
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = staff_absences.employee_id 
      AND employees.id = auth.uid()
      AND staff_absences.status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = staff_absences.employee_id 
      AND employees.id = auth.uid()
      AND staff_absences.status = 'pending'
    )
  );

-- Admin and platschef can manage all absences
CREATE POLICY "Admin and platschef can manage all absences"
  ON staff_absences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_absences TO authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

CREATE TRIGGER update_staff_schedules_updated_at
  BEFORE UPDATE ON staff_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

CREATE TRIGGER update_staff_absences_updated_at
  BEFORE UPDATE ON staff_absences
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

