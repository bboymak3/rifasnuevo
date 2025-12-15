-- Migration: add password_hash column and copy existing password values
-- Run with sqlite3: sqlite3 path/to/db.sqlite < 001-add-password-hash.sql

BEGIN TRANSACTION;

-- add column if it doesn't exist (SQLite supports ADD COLUMN)
ALTER TABLE usuarios ADD COLUMN password_hash TEXT;

-- copy existing plaintext passwords into password_hash (temporary; you should hash them with the script)
UPDATE usuarios SET password_hash = password WHERE password IS NOT NULL AND TRIM(password) != '';

COMMIT;

-- After running this migration, run the scripts/hash-passwords.js to replace plaintext password_hash with salted hashes.
