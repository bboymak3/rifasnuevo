// scripts/test-admin-migrate.mjs
// Local unit test: import the admin migrate function and call it with a mocked context
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure webcrypto
const nodeCrypto = await import('crypto');
if (!globalThis.crypto) globalThis.crypto = nodeCrypto.webcrypto;

function createMockDB() {
  const tables = {};
  return {
    prepare(sql) {
      const _sql = sql.trim();
      const stmt = {
        sql: _sql,
        _args: [],
        bind(...args) { this._args = args; return this; },
        async run() {
          // Simulate create table or insert
          if (/CREATE TABLE/i.test(_sql)) return { changes: 0 };
          if (/INSERT OR IGNORE INTO tickets/i.test(_sql)) return { changes: 100 };
          return { changes: 0, meta: { last_row_id: 1 } };
        },
        async first() { return undefined; },
        async all() { return []; }
      };
      return stmt;
    }
  };
}

const db = createMockDB();
const context = {
  request: {
    method: 'POST',
    json: async () => ({ action: 'recreate', force: true, seed: true }),
    headers: {
      get(name) {
        if (name.toLowerCase() === 'authorization') return 'Bearer test-token';
        return null;
      }
    }
  },
  env: { DB: db, ADMIN_TOKEN: 'test-token' }
};

const mod = await import('../functions/api/admin/migrate.js');
const resp = await mod.onRequest(context);
const body = await resp.text();
console.log('Response:', resp.status, body);
