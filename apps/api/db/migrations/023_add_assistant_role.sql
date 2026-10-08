-- migrate:up
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'assistant_doctor';

-- migrate:down
-- Postgres does not support removing values from ENUM easily.
