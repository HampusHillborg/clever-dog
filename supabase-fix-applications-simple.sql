-- Simple fix: Ensure anonymous users can insert applications
-- This is the correct setup for public booking forms
-- Run this in Supabase SQL Editor

-- Step 1: Ensure RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Step 2: Grant INSERT to anon role (this is critical!)
GRANT INSERT ON applications TO anon;

-- Step 3: Drop and recreate the public insert policy
-- This MUST be TO anon only (not authenticated)
DROP POLICY IF EXISTS "Public can insert applications" ON applications;

CREATE POLICY "Public can insert applications"
  ON applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Step 4: Ensure admin policy exists (for reading/updating)
DROP POLICY IF EXISTS "Admin and platschef can manage applications" ON applications;

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

-- Verify
SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'applications';

