-- Fix RLS policies for applications table to allow public inserts
-- Run this in Supabase SQL Editor

-- First, drop existing policies that might conflict
DROP POLICY IF EXISTS "Public can insert applications" ON applications;
DROP POLICY IF EXISTS "Admin users can manage applications" ON applications;
DROP POLICY IF EXISTS "Admin and platschef can manage applications" ON applications;

-- Policy: Allow public (anon) to insert applications (for the forms)
-- This is critical for the booking forms to work
CREATE POLICY "Public can insert applications"
  ON applications
  FOR INSERT
  TO anon, authenticated
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
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'applications';

