-- Fix missing admin_users entries for existing auth.users
-- Run this in your Supabase SQL Editor
-- This will create admin_users entries for any users in auth.users that don't have one

-- Insert missing admin_users entries
INSERT INTO public.admin_users (id, email, role)
SELECT 
  au.id,
  au.email,
  'employee' as role
FROM auth.users au
LEFT JOIN public.admin_users adu ON au.id = adu.id
WHERE adu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the results
SELECT 
  au.id,
  au.email,
  adu.role,
  CASE WHEN adu.id IS NULL THEN 'MISSING' ELSE 'OK' END as status
FROM auth.users au
LEFT JOIN public.admin_users adu ON au.id = adu.id
ORDER BY au.email;

