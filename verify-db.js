// verify-db.js - Verificar/crear tablas si no existen
export default {
  async fetch(request, env) {
    const DB = env.DB;
    
    console.log("🔍 Verificando tablas...");
    
    // 1. Tabla usuarios
    await DB.exec(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      nombre TEXT,
      password_hash TEXT,
      puntos INTEGER DEFAULT 0
    );`);
    console.log("✅ Tabla 'usuarios' verificada");
    
    // 2. Tabla numeros_rifa
    await DB.exec(`CREATE TABLE IF NOT EXISTS numeros_rifa (
      id INTEGER PRIMARY KEY,
      estado TEXT DEFAULT 'disponible',
      usuario_id INTEGER NULL,
      comprado_en DATETIME NULL
    );`);
    console.log("✅ Tabla 'numeros_rifa' verificada");
    
    // 3. Insertar números 1-100 si está vacía
    const count = await DB.prepare('SELECT COUNT(*) as total FROM numeros_rifa').first();
    console.log(`📊 Números en BD: ${count.total}`);
    
    if (count.total === 0) {
      console.log("📝 Insertando 100 números...");
      for (let i = 1; i <= 100; i++) {
        await DB.prepare('INSERT OR IGNORE INTO numeros_rifa (id) VALUES (?)').bind(i).run();
      }
      console.log("✅ 100 números insertados");
    }
    
    // 4. Tabla transacciones
    await DB.exec(`CREATE TABLE IF NOT EXISTS transacciones (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER,
      tipo TEXT,
      puntos INTEGER,
      descripcion TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    console.log("✅ Tabla 'transacciones' verificada");
    
    return new Response('✅ Base de datos verificada correctamente');
  }
};