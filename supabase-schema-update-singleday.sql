-- Update dogs table to include 'singleDay' and 'boarding' as valid types
-- Run this in your Supabase SQL Editor

-- Drop the old check constraint
ALTER TABLE dogs DROP CONSTRAINT IF EXISTS dogs_type_check;

-- Add the new check constraint with 'singleDay' and 'boarding' included
ALTER TABLE dogs 
  ADD CONSTRAINT dogs_type_check 
  CHECK (type IS NULL OR type IN ('fulltime', 'parttime-3', 'parttime-2', 'singleDay', 'boarding'));

