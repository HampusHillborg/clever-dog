-- Fix for 401 Unauthorized when inserting applications as anonymous user
-- This ensures RLS policies work correctly for public inserts
-- Run this in Supabase SQL Editor

-- Step 1: Verify RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can insert applications" ON applications;
DROP POLICY IF EXISTS "Admin users can manage applications" ON applications;
DROP POLICY IF EXISTS "Admin and platschef can manage applications" ON applications;

-- Step 3: Grant INSERT permission to anon role (critical!)
GRANT INSERT ON applications TO anon;

-- Step 4: Create policy for anonymous inserts
-- IMPORTANT: This must be TO anon only, not authenticated
CREATE POLICY "Public can insert applications"
  ON applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Step 5: Create policy for authenticated admin/platschef users
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

-- Step 6: Verify everything is correct
SELECT 
  'Policies' as check_type,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'applications'
ORDER BY policyname;

SELECT 
  'Grants' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'applications'
  AND grantee = 'anon'
ORDER BY privilege_type;

-- Expected results:
-- 1. "Public can insert applications" policy with cmd=INSERT, roles={anon}
-- 2. "Admin and platschef can manage applications" policy with cmd=ALL, roles={authenticated}
-- 3. anon should have INSERT privilege

