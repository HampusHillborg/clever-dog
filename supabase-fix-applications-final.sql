-- Final fix for applications table - GRANT permissions and verify RLS
-- Run this in Supabase SQL Editor

-- Step 1: Grant INSERT permission to anon role (critical for public forms)
GRANT INSERT ON applications TO anon;

-- Step 2: Grant other permissions to authenticated role
GRANT SELECT ON applications TO authenticated;
GRANT UPDATE ON applications TO authenticated;
GRANT DELETE ON applications TO authenticated;

-- Step 3: Verify RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify current policies (should match what you see)
SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'applications'
ORDER BY policyname;

-- Step 5: Verify GRANT permissions were applied
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'applications'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- Expected result:
-- anon should have INSERT
-- authenticated should have SELECT, UPDATE, DELETE

