-- Add chip_number field to dogs table
-- Run this in your Supabase SQL Editor

-- Add chip_number column (nullable)
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS chip_number TEXT;

-- Optional: Add comment to document the column
COMMENT ON COLUMN dogs.chip_number IS 'Microchip/Tattoo number for contract generation';

