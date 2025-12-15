// functions/api/admin/migrate.js
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  // Simple auth: Bearer ADMIN_TOKEN
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const ADMIN_TOKEN = env.ADMIN_TOKEN || '';

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const action = body.action || 'recreate';
    const force = !!body.force;
    const seed = body.seed !== false; // default true
    const db = env.DB;

    const logs = [];

    // Optional backup: return snapshot of key tables before destructive ops
    if (body.backup) {
      logs.push('Realizando backup previo...');
      const usuarios = await db.prepare('SELECT * FROM usuarios').all().catch(e => null);
      const recargas = await db.prepare('SELECT * FROM recargas').all().catch(e => null);
      const tickets = await db.prepare('SELECT * FROM tickets').all().catch(e => null);
      const ventas = await db.prepare('SELECT * FROM ventas').all().catch(e => null);
      return new Response(JSON.stringify({ success: true, backup: { usuarios, recargas, tickets, ventas } }), { headers: { 'Content-Type': 'application/json' } });
    }

    // If action = recreate, run drop + create statements from migrations file.
    if (action === 'recreate') {
      logs.push('Ejecutando recreación de esquema...');

      // If not forced, safeguard: only run create if tables are missing or if force=true
      if (!force) {
        // Check if usuarios exists
        try {
          const check = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'").first();
          if (check && check.name) {
            logs.push('Tabla usuarios ya existe; para forzar el borrado use force=true');
            return new Response(JSON.stringify({ success: false, error: 'Schema ya existe. Use force=true para recrear (borrará datos).' , logs }), { headers: { 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          logs.push('No se pudo comprobar existencia de tablas: ' + e.message);
        }
      }

      // Execute drop & create statements (read from migrations file if present)
      const recreateSQL = `-- recreate inline
DROP TABLE IF EXISTS venta_tickets;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS recargas;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS settings;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  cedula TEXT,
  telefono TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  creditos INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recargas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  metodo_pago TEXT,
  monto REAL,
  puntos INTEGER DEFAULT 0,
  referencia_pago TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fecha_solicitud TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_procesado TEXT,
  admin_id INTEGER,
  FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS tickets (
  numero INTEGER PRIMARY KEY,
  vendido INTEGER NOT NULL DEFAULT 0,
  userId INTEGER,
  venta_id INTEGER,
  fecha_creacion TEXT
);

CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  total REAL NOT NULL,
  metodo_pago TEXT,
  creditos_usados INTEGER DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'completada',
  comprobante TEXT,
  fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS venta_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  precio REAL NOT NULL,
  FOREIGN KEY(venta_id) REFERENCES ventas(id),
  FOREIGN KEY(numero) REFERENCES tickets(numero)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('precio_ticket', '499');
INSERT OR IGNORE INTO settings (key, value) VALUES ('puntos_por_bs', '1');
`;

      // Split and execute statements safely
      const stmts = recreateSQL.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
      for (const s of stmts) {
        try {
          await db.prepare(s).run();
          logs.push('Executed: ' + (s.split('\n')[0].slice(0,80)));
        } catch (e) {
          logs.push('Error executing stmt: ' + e.message + ' | stmt: ' + (s.split('\n')[0].slice(0,200)));
          // On error, continue to next to leave DB in consistent state where possible
        }
      }

      if (seed) {
        logs.push('Sembrando tickets 1..100...');
        const now = new Date().toISOString();
        for (let i=1;i<=100;i++){
          await db.prepare('INSERT OR IGNORE INTO tickets (numero, vendido, userId, fecha_creacion) VALUES (?, 0, NULL, ?)').bind(i, now).run();
        }
        logs.push('Sembrado tickets');
      }

      return new Response(JSON.stringify({ success: true, message: 'Recreación completada', logs }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Acción no reconocida' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('ERROR migrate admin:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
