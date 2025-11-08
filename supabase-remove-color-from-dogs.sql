-- Remove color column from dogs table
-- Run this in your Supabase SQL Editor

-- Make color nullable first (if it's NOT NULL)
ALTER TABLE dogs 
ALTER COLUMN color DROP NOT NULL;

-- Then drop the column
ALTER TABLE dogs 
DROP COLUMN IF EXISTS color;

