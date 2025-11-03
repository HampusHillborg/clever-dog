-- Fix RLS policies and GRANT permissions for applications table
-- Run this in Supabase SQL Editor

-- First, grant necessary permissions to anon role
GRANT INSERT ON applications TO anon;
GRANT SELECT ON applications TO authenticated;
GRANT UPDATE ON applications TO authenticated;
GRANT DELETE ON applications TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can insert applications" ON applications;
DROP POLICY IF EXISTS "Admin users can manage applications" ON applications;
DROP POLICY IF EXISTS "Admin and platschef can manage applications" ON applications;

-- Policy: Allow public (anon) to insert applications
-- This is critical - must be TO anon (not authenticated)
CREATE POLICY "Public can insert applications"
  ON applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated admin/platschef users to read/write all applications
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'applications'
ORDER BY policyname;

-- Verify permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'applications'
ORDER BY grantee, privilege_type;

