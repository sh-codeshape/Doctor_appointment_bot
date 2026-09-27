CREATE TABLE medicine_dosages (
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
    ('As directed');

ALTER TABLE medicines
ADD COLUMN dosage_id INTEGER
REFERENCES medicine_dosages(id);

ALTER TABLE medicines
DROP COLUMN IF EXISTS default_dosage;
