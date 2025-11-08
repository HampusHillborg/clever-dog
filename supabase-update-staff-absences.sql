-- Update staff_absences table to match code
-- Run this in your Supabase SQL Editor
-- SÄKERT ATT KÖRA FLERA GÅNGER

-- Check if 'type' column exists, if not rename 'reason' to 'type'
DO $$
BEGIN
  -- If 'reason' exists but 'type' doesn't, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_absences' AND column_name = 'reason'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_absences' AND column_name = 'type'
  ) THEN
    ALTER TABLE staff_absences RENAME COLUMN reason TO type;
  END IF;
END $$;

-- Update constraint to include 'personal' and match code
ALTER TABLE staff_absences 
DROP CONSTRAINT IF EXISTS staff_absences_type_check;

ALTER TABLE staff_absences 
DROP CONSTRAINT IF EXISTS staff_absences_reason_check;

ALTER TABLE staff_absences 
ADD CONSTRAINT staff_absences_type_check 
CHECK (type IN ('sick', 'vacation', 'personal', 'other'));

-- Add 'reason' column if it doesn't exist (for optional notes)
ALTER TABLE staff_absences 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add reviewed_by and reviewed_at if they don't exist
ALTER TABLE staff_absences 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE staff_absences 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add CHECK constraint for end_date >= start_date
ALTER TABLE staff_absences 
DROP CONSTRAINT IF EXISTS staff_absences_date_check;

ALTER TABLE staff_absences 
ADD CONSTRAINT staff_absences_date_check 
CHECK (end_date >= start_date);

-- Update staff_schedules to make start_time and end_time NOT NULL (if needed)
-- But first check if they're already NOT NULL
DO $$
BEGIN
  -- Only alter if they're currently nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_schedules' 
    AND column_name = 'start_time' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE staff_schedules ALTER COLUMN start_time SET NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_schedules' 
    AND column_name = 'end_time' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE staff_schedules ALTER COLUMN end_time SET NOT NULL;
  END IF;
END $$;

-- Add created_by column if it doesn't exist
ALTER TABLE staff_schedules 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- Add UNIQUE constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'staff_schedules_unique'
  ) THEN
    ALTER TABLE staff_schedules 
    ADD CONSTRAINT staff_schedules_unique 
    UNIQUE(employee_id, date, start_time, location);
  END IF;
END $$;

-- Verify the changes
-- You can run these queries to check:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'staff_absences' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'staff_schedules' 
-- ORDER BY ordinal_position;

