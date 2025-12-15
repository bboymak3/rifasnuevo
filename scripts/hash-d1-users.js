#!/usr/bin/env node
// scripts/hash-d1-users.js
// Usage (env vars):
// ACCOUNT_ID=... DB_NAME=... API_TOKEN=... node scripts/hash-d1-users.js

const fetch = require('node-fetch');
const crypto = require('crypto');

const ACCOUNT_ID = process.env.ACCOUNT_ID;
const DB_NAME = process.env.DB_NAME; // in D1 it's the database name
const API_TOKEN = process.env.API_TOKEN;

if(!ACCOUNT_ID || !DB_NAME || !API_TOKEN){
  console.error('Usage: set ACCOUNT_ID, DB_NAME and API_TOKEN env vars');
  process.exit(1);
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/databases/${DB_NAME}/query`;

async function runSql(sql){
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  });
  const data = await res.json();
  if(!data.success){
    throw new Error('API error: ' + JSON.stringify(data.errors || data));
  }
  return data;
}

function hashWithSalt(password, salt){
  const h = crypto.createHash('sha256');
  h.update(salt + password, 'utf8');
  return h.digest('hex');
}

async function main(){
  console.log('Fetching usuarios...');
  const selectRes = await runSql('SELECT id, password, password_hash FROM usuarios');
  const rows = selectRes.results || [];
  console.log(`Found ${rows.length} usuarios`);

  for(const row of rows){
    const id = row.id;
    const pw = row.password;
    const ph = row.password_hash;

    if(ph && ph.includes('$')){
      console.log(`id=${id}: already hashed, skipping`);
      continue;
    }

    const toHash = (pw && pw.trim()) ? pw : (ph && ph.trim() ? ph : null);
    if(!toHash){
      console.log(`id=${id}: no password available, skipping`);
      continue;
    }

    const salt = crypto.randomBytes(12).toString('hex');
    const hashHex = hashWithSalt(toHash, salt);
    const stored = `${salt}$${hashHex}`;

    console.log(`id=${id}: updating password_hash`);
    const updateSql = `UPDATE usuarios SET password_hash = '${stored}' WHERE id = ${id}`;
    await runSql(updateSql);
  }

  console.log('Done.');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
