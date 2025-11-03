-- Drop and recreate applications table with correct RLS policies
-- This ensures a clean setup for public form submissions

-- Step 1: Drop the table (cascade will remove dependencies)
DROP TABLE IF EXISTS applications CASCADE;

-- Step 2: Create the table with all fields
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  
  -- Owner information
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT,
  owner_address TEXT,
  owner_city TEXT,
  owner_postal_code TEXT,
  owner_personnummer TEXT,
  
  -- Dog information
  dog_name TEXT NOT NULL,
  dog_breed TEXT,
  dog_gender TEXT,
  dog_height TEXT,
  dog_age TEXT,
  dog_chip_number TEXT,
  is_neutered TEXT,
  
  -- Service information
  service_type TEXT NOT NULL, -- 'daycare', 'parttime', 'general', 'boarding', 'singleDay', 'socialWalk', 'question'
  days_per_week TEXT,
  start_date DATE,
  end_date DATE,
  part_time_days TEXT,
  
  -- Additional information
  dog_socialization TEXT,
  problem_behaviors TEXT,
  allergies TEXT,
  additional_info TEXT,
  message TEXT,
  
  -- Status and matching
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approved', 'rejected', 'matched', 'added')),
  matched_dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
  matched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  
  -- Admin notes
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Grant permissions FIRST (before enabling RLS)
-- anon can INSERT (for public forms)
GRANT INSERT ON applications TO anon;
-- authenticated can SELECT, UPDATE, DELETE (for admin users)
GRANT SELECT, UPDATE, DELETE ON applications TO authenticated;

-- Step 4: Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Policy 1: Anonymous users can INSERT applications (for public booking forms)
-- This policy is very permissive - anyone can insert, no checks needed
CREATE POLICY "anon_insert_applications"
  ON applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 2: Admin and platschef can SELECT all applications
CREATE POLICY "admin_select_applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Policy 3: Admin and platschef can UPDATE applications
CREATE POLICY "admin_update_applications"
  ON applications
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

-- Policy 4: Admin and platschef can DELETE applications
CREATE POLICY "admin_delete_applications"
  ON applications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'platschef')
    )
  );

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_location ON applications(location);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_owner_phone_dog_name ON applications(owner_phone, dog_name);

-- Step 7: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to automatically update updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();

-- Step 9: Verify the setup
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

