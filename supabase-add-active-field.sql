-- Add is_active field to dogs table
-- Run this in your Supabase SQL Editor

-- Add is_active column with default true
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Update existing dogs to be active by default (in case there are any null values)
UPDATE dogs 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Add index for better query performance when filtering by active status
CREATE INDEX IF NOT EXISTS idx_dogs_is_active ON dogs(is_active);

