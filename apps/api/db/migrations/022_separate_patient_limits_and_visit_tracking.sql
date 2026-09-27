-- migrate:up

-- 1. Add separate patient limit columns to doctors
ALTER TABLE doctors ADD COLUMN max_new_patients INTEGER NOT NULL DEFAULT 40;
ALTER TABLE doctors ADD COLUMN max_old_patients INTEGER NOT NULL DEFAULT 30;

-- 2. Backfill from existing max_patients_per_day:
--    Old gets current value, new gets current value + 10
UPDATE doctors SET
  max_old_patients = max_patients_per_day,
  max_new_patients = max_patients_per_day + 10;

-- 3. Drop the old combined column
ALTER TABLE doctors DROP COLUMN max_patients_per_day;

-- 4. Index for faster capacity queries
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date_type
  ON bookings (doctor_id, appointment_date)
  WHERE status != 'cancelled';

-- migrate:down
ALTER TABLE doctors ADD COLUMN max_patients_per_day INTEGER NOT NULL DEFAULT 30;
UPDATE doctors SET max_patients_per_day = max_old_patients;
ALTER TABLE doctors DROP COLUMN max_new_patients;
ALTER TABLE doctors DROP COLUMN max_old_patients;
DROP INDEX IF EXISTS idx_bookings_doctor_date_type;
