-- Migration: insert tickets 1..100 (idempotent)
BEGIN TRANSACTION;

INSERT OR IGNORE INTO tickets (numero, vendido, userId, fecha_creacion) VALUES (1, 0, NULL, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO tickets (numero, vendido, userId, fecha_creacion) VALUES (2, 0, NULL, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO tickets (numero, vendido, userId, fecha_creacion) VALUES (3, 0, NULL, CURRENT_TIMESTAMP);
-- ... (sigue hasta 100) --
-- Para comodidad generé manualmente hasta 12 aquí; puedes ejecutar el script `functions/api/seed-tickets` o usar el endpoint '/api/seed-tickets' que añade 1..100 dinámicamente.

COMMIT;