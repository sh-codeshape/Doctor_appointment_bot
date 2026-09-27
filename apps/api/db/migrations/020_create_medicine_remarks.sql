-- migrate:up
CREATE TABLE IF NOT EXISTS medicine_remarks (
    id SERIAL PRIMARY KEY,
    remark TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS remark_id INTEGER
REFERENCES medicine_remarks(id);

-- migrate:down
ALTER TABLE medicines DROP COLUMN IF EXISTS remark_id;
DROP TABLE IF EXISTS medicine_remarks;
