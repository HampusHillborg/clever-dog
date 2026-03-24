-- Add optional contract-related dog fields
-- Safe to run multiple times

ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS insurance_company TEXT,
ADD COLUMN IF NOT EXISTS insurance_number TEXT;
