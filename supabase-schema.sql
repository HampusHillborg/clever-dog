-- Supabase Database Schema for Clever Dog Admin Panel
-- Run this in your Supabase SQL Editor

-- Dogs table
CREATE TABLE IF NOT EXISTS dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  breed TEXT NOT NULL,
  age TEXT NOT NULL,
  owner TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  color TEXT NOT NULL,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of 'malmo' | 'staffanstorp'
  type TEXT CHECK (type IN ('fulltime', 'parttime-3', 'parttime-2')),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boarding records table
CREATE TABLE IF NOT EXISTS boarding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  dog_name TEXT NOT NULL, -- Denormalized for easier queries
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planning history table
CREATE TABLE IF NOT EXISTS planning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  cages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of Cage objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, location) -- One planning per day per location
);

-- Box settings table
CREATE TABLE IF NOT EXISTS box_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  settings JSONB NOT NULL DEFAULT '{"cages": [], "freeAreas": []}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location) -- One settings record per location
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dogs_locations ON dogs USING GIN(locations);
CREATE INDEX IF NOT EXISTS idx_dogs_is_active ON dogs(is_active);
CREATE INDEX IF NOT EXISTS idx_boarding_location ON boarding_records(location);
CREATE INDEX IF NOT EXISTS idx_boarding_dates ON boarding_records(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_boarding_archived ON boarding_records(is_archived);
CREATE INDEX IF NOT EXISTS idx_planning_date_location ON planning_history(date, location);
CREATE INDEX IF NOT EXISTS idx_box_settings_location ON box_settings(location);

-- Enable Row Level Security (RLS) - we'll handle auth in Netlify Functions
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_settings ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (we'll handle auth in application layer)
-- In production, you should create proper RLS policies based on auth
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Allow all operations" ON dogs;
DROP POLICY IF EXISTS "Allow all operations" ON boarding_records;
DROP POLICY IF EXISTS "Allow all operations" ON planning_history;
DROP POLICY IF EXISTS "Allow all operations" ON box_settings;

CREATE POLICY "Allow all operations" ON dogs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON boarding_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON planning_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON box_settings FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_dogs_updated_at ON dogs;
DROP TRIGGER IF EXISTS update_boarding_records_updated_at ON boarding_records;
DROP TRIGGER IF EXISTS update_planning_history_updated_at ON planning_history;
DROP TRIGGER IF EXISTS update_box_settings_updated_at ON box_settings;

CREATE TRIGGER update_dogs_updated_at BEFORE UPDATE ON dogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boarding_records_updated_at BEFORE UPDATE ON boarding_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_history_updated_at BEFORE UPDATE ON planning_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_box_settings_updated_at BEFORE UPDATE ON box_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

