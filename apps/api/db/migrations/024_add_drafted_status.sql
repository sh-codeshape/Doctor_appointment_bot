-- migrate:up
ALTER TYPE booking_status_enum ADD VALUE 'drafted';
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- migrate:down
DROP INDEX IF NOT EXISTS idx_bookings_status;
-- Note: Postgres does not support removing values from an ENUM type easily.

