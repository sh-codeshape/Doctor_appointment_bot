-- migrate:up

ALTER TABLE departments RENAME_COLUMN 'RMO - Resident Medical Officer' to 'General Physician'


-- migrate:down

ALTER TABLE departments RENAME_COLUMN 'General Physician' to 'RMO - Resident Medical Officer'
