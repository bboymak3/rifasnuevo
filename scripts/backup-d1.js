#!/usr/bin/env node
// scripts/backup-d1.js
// Usage: node scripts/backup-d1.js <ADMIN_TOKEN> <OUTPUT_FILE.json>
import fs from 'fs';
import fetch from 'node-fetch';

const token = process.argv[2];
const out = process.argv[3] || 'backup.json';
if (!token) {
  console.error('Usage: node scripts/backup-d1.js <ADMIN_TOKEN> [out.json]');
  process.exit(1);
}

const url = process.env.SITE_URL || 'https://rifasnuevo.pages.dev';
(async () => {
  try {
    const res = await fetch(url + '/api/admin/backup', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    if (!data.success) {
      console.error('Backup failed:', data);
      process.exit(2);
    }
    fs.writeFileSync(out, JSON.stringify(data.data, null, 2));
    console.log('Backup written to', out);
  } catch (e) {
    console.error('Error:', e);
    process.exit(3);
  }
})();
