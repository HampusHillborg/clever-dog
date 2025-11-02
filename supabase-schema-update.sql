-- Supabase Database Schema UPDATE - Säkert att köra med befintlig data
-- Denna fil lägger bara TILL box_settings tabellen utan att ändra befintliga saker
-- Run this in your Supabase SQL Editor

-- Box settings table (skapar bara om den inte finns)
CREATE TABLE IF NOT EXISTS box_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('malmo', 'staffanstorp')),
  settings JSONB NOT NULL DEFAULT '{"cages": [], "freeAreas": []}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location) -- One settings record per location
);

-- Index för box_settings (skapar bara om det inte finns)
CREATE INDEX IF NOT EXISTS idx_box_settings_location ON box_settings(location);

-- Enable Row Level Security (säkert att köra flera gånger)
ALTER TABLE box_settings ENABLE ROW LEVEL SECURITY;

-- Policy för box_settings (använder DO-block för att undvika fel om den redan finns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'box_settings' 
    AND policyname = 'Allow all operations'
  ) THEN
    CREATE POLICY "Allow all operations" ON box_settings 
    FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Function för updated_at (säkert att köra flera gånger)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger för box_settings (använder DO-block för att undvika fel om den redan finns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_box_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_box_settings_updated_at 
    BEFORE UPDATE ON box_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

