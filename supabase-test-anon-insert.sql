-- Test script to verify anon can insert
-- Run this in Supabase SQL Editor to test if the policy works

-- First, check current policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'applications';

-- Check permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'applications'
ORDER BY grantee, privilege_type;

-- Try to insert as anon (this will only work if policy is correct)
-- Note: This is just to verify the structure, actual insert happens via REST API
INSERT INTO applications (
  location,
  owner_name,
  owner_email,
  service_type,
  dog_name,
  status
) VALUES (
  'malmo',
  'Test User',
  'test@example.com',
  'daycare',
  'Test Dog',
  'new'
);

-- If the above works, you should see a new row
SELECT * FROM applications WHERE owner_email = 'test@example.com';

-- Clean up test
DELETE FROM applications WHERE owner_email = 'test@example.com';

