// seed.js - Ejecutar: npx wrangler d1 execute rifasv2 --file=seed.js

// Primero, crear la tabla si no existe (ya la tienes, pero por seguridad)
await DB.exec(`
  CREATE TABLE IF NOT EXISTS numeros_rifa (
    id INTEGER PRIMARY KEY,
    estado TEXT DEFAULT 'disponible',
    usuario_id INTEGER NULL,
    comprado_en DATETIME NULL
  );
`);

// Insertar números del 1 al 100
const insertPromises = [];
for (let i = 1; i <= 100; i++) {
  insertPromises.push(
    DB.prepare('INSERT OR IGNORE INTO numeros_rifa (id) VALUES (?)')
      .bind(i)
      .run()
  );
}

// Ejecutar todas las inserciones
const results = await Promise.all(insertPromises);
console.log(`Insertados ${results.length} números en la rifa`);