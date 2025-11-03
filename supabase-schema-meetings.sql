-- Meetings table for storing customer meetings
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dog_name TEXT,
  phone TEXT,
  email TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (admin, employee, platschef) can manage meetings
CREATE POLICY "Authenticated users can manage meetings"
  ON meetings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  );

-- Create index on date and location for faster queries
CREATE INDEX IF NOT EXISTS idx_meetings_date_location ON meetings(date, location);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

