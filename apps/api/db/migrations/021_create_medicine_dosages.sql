-- migrate:up
CREATE TABLE IF NOT EXISTS medicine_dosages (
    id SERIAL PRIMARY KEY,
    dosage TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO medicine_dosages (dosage)
VALUES
    ('1-0-1'),
    ('1-1-1'),
    ('1-0-0'),
    ('0-0-1'),
    ('0-1-0'),
    ('0-1-1'),
    ('1-1-0'),
    ('As directed')
ON CONFLICT (dosage) DO NOTHING;

-- Seed default remarks if table exists but is empty
INSERT INTO medicine_remarks (remark)
SELECT r FROM unnest(ARRAY[
    'Take after food',
    'Take before food',
    'Take with water',
    'Do not take on empty stomach',
    'As directed by doctor',
    'Apply locally',
    'SOS (as needed)',
    'At bedtime'
]) AS r
WHERE NOT EXISTS (SELECT 1 FROM medicine_remarks LIMIT 1);

ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS dosage_id INTEGER
REFERENCES medicine_dosages(id);

-- migrate:down
ALTER TABLE medicines DROP COLUMN IF EXISTS dosage_id;
DROP TABLE IF EXISTS medicine_dosages;
