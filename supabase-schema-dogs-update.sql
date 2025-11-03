-- Migration: Add contract fields to dogs table
-- Run this in Supabase SQL Editor

-- Add owner_address column
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS owner_address TEXT;

-- Add owner_city column
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS owner_city TEXT;

-- Add owner_personal_number column
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS owner_personal_number TEXT;

-- Optional: Add comments to document the columns
COMMENT ON COLUMN dogs.owner_address IS 'Owner address for contract generation';
COMMENT ON COLUMN dogs.owner_city IS 'Owner city for contract generation';
COMMENT ON COLUMN dogs.owner_personal_number IS 'Owner personal number (personnummer) for contract generation';

