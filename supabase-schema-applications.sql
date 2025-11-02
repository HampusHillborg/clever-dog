-- Applications table for storing booking applications from /malmo and /staffanstorp pages
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  
  -- Owner information
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT,
  owner_address TEXT,
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

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admin users can read/write applications
CREATE POLICY "Admin users can manage applications"
  ON applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Allow public to insert applications (for the forms)
CREATE POLICY "Public can insert applications"
  ON applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_location ON applications(location);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_owner_phone_dog_name ON applications(owner_phone, dog_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
-- Note: If you get an error that the trigger already exists, 
-- run this first: DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();

