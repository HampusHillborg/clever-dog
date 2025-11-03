-- Update admin_users table to support 'platschef' role
-- Run this in your Supabase SQL Editor

-- Remove the old CHECK constraint
ALTER TABLE admin_users 
DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add new CHECK constraint that includes 'platschef'
ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('admin', 'employee', 'platschef'));

-- Update applications policy to allow platschef to manage applications
-- First, drop the old policy
DROP POLICY IF EXISTS "Admin users can manage applications" ON applications;

-- Create new policy that includes both admin and platschef
CREATE POLICY "Admin and platschef can manage applications"
  ON applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Verify the updates
-- You can check by running:
-- SELECT column_name, data_type, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'admin_users_role_check';

