DB migration and password hashing

1) Add `password_hash` column and copy existing `password` values (temporary):

   sqlite3 path/to/db.sqlite < migrations/001-add-password-hash.sql

2) Hash plaintext passwords and store securely (script provided):

   node scripts/hash-passwords.js path/to/db.sqlite

3) If the tickets table is empty, use the Admin Panel -> 'Sembrar 1..100' button, or call the endpoint:

   curl -X POST 'https://YOUR_DOMAIN/api/seed-tickets'

Notes:
- The Node script uses salted SHA-256 and stores values as `salt$hexhash` in `password_hash`.
- In production you should use a stronger KDF (pbkdf2, bcrypt, argon2). The code in `functions/api/*` uses Web Crypto to verify hashes.
- If your DB is Cloudflare D1, run the SQL in the D1 console or use the D1 REST API to execute the migration.
