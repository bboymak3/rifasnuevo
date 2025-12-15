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

Admin endpoints (safe way to run from your environment):

- `GET /api/admin/backup` (Authorization: Bearer <ADMIN_TOKEN>): returns JSON snapshot of `usuarios`, `recargas`, `tickets`, `ventas` so you can download a backup before destructive operations.
- `POST /api/admin/migrate` (Authorization: Bearer <ADMIN_TOKEN>): body JSON { action: 'recreate', force: true|false, seed: true|false }
   - `action: 'recreate'` will drop/create tables and (optionally) seed tickets 1..100.
   - Default is not to force-drop existing schema unless `force=true` is provided.

Example (PowerShell):

```powershell
$env:ADMIN_TOKEN = '...'
$body = @{ action='recreate'; force = $true; seed = $true } | ConvertTo-Json
Invoke-RestMethod -Uri 'https://rifasnuevo.pages.dev/api/admin/migrate' -Method POST -Body $body -Headers @{ Authorization = "Bearer $env:ADMIN_TOKEN" } -ContentType 'application/json'
```

Example: backup

```powershell
Invoke-RestMethod -Uri 'https://rifasnuevo.pages.dev/api/admin/backup' -Headers @{ Authorization = "Bearer $env:ADMIN_TOKEN" }
```

If you prefer I execute the migration for you, set the `ADMIN_TOKEN` in Cloudflare Pages environment variables and POST to `/api/admin/migrate` with `{ action: 'recreate', force: true, seed: true }`. I will not request your token in chat — run the request yourself and paste the response logs here.

Local tests:

- A test script `scripts/test-registro.mjs` was added to simulate registrations against a mocked D1 instance.
   - It runs three scenarios: table with legacy `password` column, table without it, and a simulated PRAGMA failure that triggers the fallback insert.
   - Run it locally with:

```bash
node scripts/test-registro.mjs
```

This script verifies that `functions/api/registro.js` handles both schemas and falls back safely when PRAGMA cannot be read.
