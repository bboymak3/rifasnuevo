// scripts/test-registro.mjs
// Simple test runner that mocks a Cloudflare D1-like DB and invokes onRequest from functions/api/registro.js

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('=== test-registro: starting ===');
// Ensure Node's webcrypto is available as `crypto` global (for subtle + getRandomValues)
// Use top-level await so it's guaranteed available before importing the worker module.
const nodeCrypto = await import('crypto');
if (globalThis.crypto === undefined) {
  globalThis.crypto = nodeCrypto.webcrypto;
}
console.log('=== test-registro: webcrypto available ===');

function createMockDB({ hasPasswordCol = false, pragmaThrows = false } = {}) {
  const rows = [];
  let idCounter = 0;

  return {
    prepare(sql) {
      return {
        sql,
        _args: [],
        bind(...args) { this._args = args; return this; },
        async first() {
          // SELECT 1 as test
          if (/SELECT\s+1\s+as\s+test/i.test(sql)) return { test: 1 };

          // SELECT id FROM usuarios WHERE email = ?
          if (/SELECT\s+id\s+FROM\s+usuarios\s+WHERE\s+email\s*=\s*\?/i.test(sql)) {
            const email = this._args && this._args[0];
            const found = rows.find(r => r.email === email);
            return found ? { id: found.id } : undefined;
          }

          return undefined;
        },
        async all() {
          // PRAGMA table_info('usuarios')
          if (/PRAGMA\s+table_info\(\'usuarios\'\)/i.test(sql)) {
            if (pragmaThrows) throw new Error('Simulated PRAGMA failure');
            const cols = [];
            let cid = 0;
            if (hasPasswordCol) {
              cols.push({ cid: cid++, name: 'password', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 });
            }
            cols.push({ cid: cid++, name: 'password_hash', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 });
            cols.push({ cid: cid++, name: 'creditos', type: 'INTEGER', notnull: 0, dflt_value: '0', pk: 0 });
            return cols;
          }
          return [];
        },
        async run() {
          // Simulate INSERT INTO usuarios ...
          if (/INSERT\s+INTO\s+usuarios/i.test(sql)) {
              // If the SQL includes 'password' but the DB doesn't have that column, simulate
              // a 'no such column' error. If the DB *does* have the column but the SQL
              // did NOT include 'password', simulate the NOT NULL constraint failure.
              const usedSql = sql.toLowerCase();
              const includesPasswordColumn = usedSql.includes('password,') || usedSql.includes('password )') || usedSql.includes('password)');
              if (!hasPasswordCol && includesPasswordColumn) {
                throw new Error('D1_ERROR: no such column: password');
              }
              if (hasPasswordCol && !includesPasswordColumn) {
                throw new Error('D1_ERROR: NOT NULL constraint failed: usuarios.password');
              }

            // Create the row using bind args. We guess columns order for our tests.
            // Our code binds in predictable order; we'll map by basic heuristics.
            idCounter += 1;
            const bound = this._args || [];
            const newRow = { id: idCounter };

            // Heuristic mapping: look for email-like string
            for (const v of bound) {
              if (typeof v === 'string' && v.includes('@')) {
                newRow.email = v;
              }
              if (typeof v === 'string' && v && !newRow.email && v.length > 0) {
                // Could be nombre or telefono or hash
              }
            }

            // Best-effort: assign password/password_hash if present in args (hex$ format) or others
            for (const v of bound) {
              if (typeof v === 'string' && v.includes('$') && v.length > 20) {
                // it's a salt$hash
                if (hasPasswordCol) {
                  // If SQL included password column (we assume first salty value is password)
                  if (!newRow.password) newRow.password = v;
                  if (!newRow.password_hash) newRow.password_hash = v;
                } else {
                  newRow.password_hash = v;
                }
              }
            }

            rows.push(newRow);
            return { meta: { last_row_id: idCounter }, lastInsertId: idCounter };
          }

          return { changes: 0 };
        }
      };
    }
  };
}

async function runScenario(name, opts) {
  console.log('\n--- Running scenario:', name, '---');
  const db = createMockDB(opts);

  // Build a mock context similar to Cloudflare Workers
  const payload = { nombre: 'Prueba ' + name, email: `prueba+${name.replace(/\s+/g,'').toLowerCase()}@example.com`, password: 'secreto123' };

  const context = {
    request: {
      method: 'POST',
      text: async () => JSON.stringify(payload)
    },
    env: { DB: db }
  };

  // Import the function under test
  const mod = await import('../functions/api/registro.js');
  const resp = await mod.onRequest(context);
  const body = await resp.text();
  console.log('HTTP status:', resp.status || 200);
  console.log('Body:', body);
}

(async function main() {
  try {
    await runScenario('HasPasswordCol', { hasPasswordCol: true, pragmaThrows: false });
    await runScenario('NoPasswordCol', { hasPasswordCol: false, pragmaThrows: false });
    await runScenario('PragmaFailsThenFallback', { hasPasswordCol: false, pragmaThrows: true });
    console.log('\nAll scenarios executed.');
  } catch (err) {
    console.error('Test runner error:', err);
    process.exit(1);
  }
})();
