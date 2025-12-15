-- migrations/000-recreate-schema.sql
-- WARNING: This script will DROP existing tables if run with force=true

-- Drop tables (only if you want to wipe)
DROP TABLE IF EXISTS venta_tickets;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS recargas;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS settings;

-- Create usuarios
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

-- Create recargas
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

-- Create tickets table compatible with existing seed
CREATE TABLE IF NOT EXISTS tickets (
  numero INTEGER PRIMARY KEY,
  vendido INTEGER NOT NULL DEFAULT 0,
  userId INTEGER,
  venta_id INTEGER,
  fecha_creacion TEXT
);

-- Create ventas / ordenes
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

-- venta_tickets
CREATE TABLE IF NOT EXISTS venta_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  precio REAL NOT NULL,
  FOREIGN KEY(venta_id) REFERENCES ventas(id),
  FOREIGN KEY(numero) REFERENCES tickets(numero)
);

-- settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('precio_ticket', '499');
INSERT OR IGNORE INTO settings (key, value) VALUES ('puntos_por_bs', '1');

-- Config tasas table (used by admin panel and purchase flows)
CREATE TABLE IF NOT EXISTS config_tasas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  valor REAL NOT NULL,
  fecha_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO config_tasas (tipo, descripcion, valor) VALUES ('rifa_ticket', 'Créditos necesarios por ticket', 100);
INSERT OR IGNORE INTO config_tasas (tipo, descripcion, valor) VALUES ('puntos_por_bs', 'Puntos por Bs recargado', 1);
INSERT OR IGNORE INTO config_tasas (tipo, descripcion, valor) VALUES ('dice_rate', 'Multiplicador del juego de dados', 2);
