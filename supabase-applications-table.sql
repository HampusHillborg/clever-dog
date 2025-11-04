-- Applications table for storing booking applications
-- This is a clean, simple schema for the application system

-- Drop existing table if needed (for recreation)
DROP TABLE IF EXISTS applications CASCADE;

-- Create the applications table
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
  service_type TEXT NOT NULL,
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

-- Create index for faster queries
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_location ON applications(location);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Grant permissions
-- Anonymous users can INSERT (for public forms)
GRANT INSERT ON applications TO anon;
-- Authenticated users can SELECT, UPDATE, DELETE (for admin)
GRANT SELECT, UPDATE, DELETE ON applications TO authenticated;

-- RLS Policies

-- Policy 1: Allow anonymous users to insert applications (for public booking forms)
CREATE POLICY "anon_insert_applications"
  ON applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 2: Allow authenticated admin/platschef users to read all applications
CREATE POLICY "authenticated_read_applications"
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

-- Policy 3: Allow authenticated admin/platschef users to update applications
CREATE POLICY "authenticated_update_applications"
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

-- Policy 4: Allow authenticated admin/platschef users to delete applications
CREATE POLICY "authenticated_delete_applications"
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

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();

