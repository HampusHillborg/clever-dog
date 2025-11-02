-- Add email field to dogs table
-- Run this in your Supabase SQL Editor

-- Add email column (nullable)
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email matching
CREATE INDEX IF NOT EXISTS idx_dogs_email ON dogs(email);

