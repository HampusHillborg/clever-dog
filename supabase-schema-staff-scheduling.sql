-- Staff Scheduling Schema for Clever Dog Admin Panel
-- Run this in your Supabase SQL Editor
-- SÄKERT ATT KÖRA FLERA GÅNGER - Använder IF NOT EXISTS och DROP POLICY IF EXISTS

-- Employees table - extends admin_users with additional employee information
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT CHECK (location IN ('malmo', 'staffanstorp', 'both')) DEFAULT 'both',
  position TEXT,
  hire_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff schedules table
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  notes TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date, start_time, location)
);

-- Staff absences table (for employees to report sickness/absence)
CREATE TABLE IF NOT EXISTS staff_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sick', 'vacation', 'personal', 'other')),
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_schedules_employee_id ON staff_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_location ON staff_schedules(location);
CREATE INDEX IF NOT EXISTS idx_staff_absences_employee_id ON staff_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_absences_start_date ON staff_absences(start_date);
CREATE INDEX IF NOT EXISTS idx_staff_absences_status ON staff_absences(status);

-- Enable Row Level Security (säkert att köra flera gånger)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_absences ENABLE ROW LEVEL SECURITY;

-- Policies for employees table
-- Drop existing policies if they exist (för att kunna köra scriptet flera gånger)
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
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employees can view their own schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Admin and platschef can view all schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Admin and platschef can manage schedules" ON staff_schedules;

-- Employees can view their own schedules
CREATE POLICY "Employees can view their own schedules"
  ON staff_schedules
  FOR SELECT
  USING (auth.uid() = employee_id);

-- Admin and platschef can view all schedules
CREATE POLICY "Admin and platschef can view all schedules"
  ON staff_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Admin and platschef can manage schedules
CREATE POLICY "Admin and platschef can manage schedules"
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
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employees can view their own absences" ON staff_absences;
DROP POLICY IF EXISTS "Employees can create their own absences" ON staff_absences;
DROP POLICY IF EXISTS "Employees can update their own pending absences" ON staff_absences;
DROP POLICY IF EXISTS "Admin and platschef can view all absences" ON staff_absences;
DROP POLICY IF EXISTS "Admin and platschef can update absences" ON staff_absences;

-- Employees can view their own absences
CREATE POLICY "Employees can view their own absences"
  ON staff_absences
  FOR SELECT
  USING (auth.uid() = employee_id);

-- Employees can create their own absences
CREATE POLICY "Employees can create their own absences"
  ON staff_absences
  FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

-- Employees can update their own pending absences
CREATE POLICY "Employees can update their own pending absences"
  ON staff_absences
  FOR UPDATE
  USING (
    auth.uid() = employee_id 
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = employee_id 
    AND status = 'pending'
  );

-- Admin and platschef can view all absences
CREATE POLICY "Admin and platschef can view all absences"
  ON staff_absences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Admin and platschef can update absences (approve/reject)
CREATE POLICY "Admin and platschef can update absences"
  ON staff_absences
  FOR UPDATE
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

-- Grant necessary permissions (säkert att köra flera gånger)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON staff_absences TO authenticated;

