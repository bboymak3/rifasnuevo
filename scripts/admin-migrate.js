#!/usr/bin/env node
// scripts/admin-migrate.js
// Usage: node scripts/admin-migrate.js <ADMIN_TOKEN> [--url https://rifasnuevo.pages.dev] [--action recreate] [--force] [--seed]
import fetch from 'node-fetch';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/admin-migrate.js <ADMIN_TOKEN> [--url <BASE_URL>] [--action <action>] [--force] [--seed]');
  process.exit(1);
}

let token = args[0];
let baseUrl = 'https://rifasnuevo.pages.dev';
let action = 'recreate';
let force = false;
let seed = true;

for (let i=1;i<args.length;i++){
  const a = args[i];
  if (a === '--url') { baseUrl = args[++i]; }
  if (a === '--action') { action = args[++i]; }
  if (a === '--force') { force = true; }
  if (a === '--no-seed') { seed = false; }
}

(async () => {
  try {
    const res = await fetch(baseUrl + '/api/admin/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action, force, seed })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error calling migrate:', e.message || e);
    process.exit(2);
  }
})();
