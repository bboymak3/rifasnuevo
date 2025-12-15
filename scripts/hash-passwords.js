#!/usr/bin/env node
// scripts/hash-passwords.js
// Usage: node scripts/hash-passwords.js /path/to/db.sqlite
// This script hashes plaintext passwords present in `usuarios.password` or in `usuarios.password_hash`
// and replaces `password_hash` with a salted SHA-256 hex value formatted as salt$hash.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

function toHex(buf){
  return Buffer.from(buf).toString('hex');
}

function hashWithSalt(password, salt){
  const h = crypto.createHash('sha256');
  h.update(salt + password, 'utf8');
  return toHex(h.digest());
}

async function main(){
  const dbPath = process.argv[2];
  if(!dbPath || !fs.existsSync(dbPath)){
    console.error('Usage: node scripts/hash-passwords.js /path/to/db.sqlite');
    process.exit(1);
  }

  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.each("SELECT id, password, password_hash FROM usuarios", (err, row)=>{
      if(err){ console.error('Error reading usuarios:', err); return; }

      const id = row.id;
      const pwPlain = row.password;
      const pwField = row.password_hash;

      // If password_hash already looks like salt$hex (contains $), skip
      if(pwField && pwField.includes('$')){
        console.log(`Skipping id=${id}, already hashed`);
        return;
      }

      const toHash = (pwPlain && pwPlain.trim()) ? pwPlain : (pwField && pwField.trim() ? pwField : null);
      if(!toHash){
        console.log(`Skipping id=${id}, no password available`);
        return;
      }

      const salt = crypto.randomBytes(12).toString('hex');
      const hashHex = hashWithSalt(toHash, salt);
      const stored = `${salt}$${hashHex}`;

      db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [stored, id], function(err){
        if(err) console.error(`Error updating id=${id}:`, err.message);
        else console.log(`Updated id=${id} -> password_hash set`);
      });
    }, ()=>{
      console.log('Done processing usuarios.');
      db.close();
    });
  });
}

main();
