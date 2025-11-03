-- Migration: Add city and postal code columns to applications table
-- Run this in Supabase SQL Editor

-- Add owner_city column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS owner_city TEXT;

-- Add owner_postal_code column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS owner_postal_code TEXT;

-- Optional: Add comments to document the columns
COMMENT ON COLUMN applications.owner_city IS 'City where the dog owner lives';
COMMENT ON COLUMN applications.owner_postal_code IS 'Postal code where the dog owner lives';

