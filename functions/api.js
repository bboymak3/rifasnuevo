// functions/api.js - ÚNICO endpoint para todo
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  console.log(`📨 ${request.method} ${pathname}`);
  
  // ========== 1. GET NÚMEROS (pública) ==========
  if (pathname === '/api/numeros' && request.method === 'GET') {
    try {
      const numeros = await DB.prepare(
        'SELECT id, estado, telefono_comprador, banco, fecha_compra FROM numeros_rifa ORDER BY id'
      ).all();
      
      return new Response(JSON.stringify({
        success: true,
        numeros: numeros.results || []
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Error cargando números'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ========== 2. MARCAR VENDIDO (admin) ==========
  if (pathname === '/api/marcar-vendido' && request.method === 'POST') {
    try {
      // Verificar admin
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No autorizado'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const token = authHeader.substring(7);
      if (token !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Contraseña incorrecta'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Procesar datos
      const data = await request.json();
      const { numeroId, telefono, banco } = data;
      
      if (!numeroId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Número requerido'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Actualizar número
      await DB.prepare(
        `UPDATE numeros_rifa 
         SET estado = 'vendido', 
             telefono_comprador = ?, 
             banco = ?,
             fecha_compra = datetime('now')
         WHERE id = ?`
      ).bind(telefono || '', banco || '', numeroId).run();
      
      return new Response(JSON.stringify({
        success: true,
        message: `Número ${numeroId} marcado como vendido`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Error marcando número'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ========== 3. INICIALIZAR DB (una sola vez) ==========
  if (pathname === '/api/iniciar-db' && request.method === 'POST') {
    try {
      // Verificar si tabla existe
      const tables = await DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='numeros_rifa'"
      ).first();
      
      if (!tables) {
        // Crear tabla
        await DB.exec(`
          CREATE TABLE IF NOT EXISTS numeros_rifa (
            id INTEGER PRIMARY KEY,
            estado TEXT DEFAULT 'disponible',
            telefono_comprador TEXT,
            banco TEXT,
            fecha_compra DATETIME
          )
        `);
        
        // Insertar números 1-100
        for (let i = 1; i <= 100; i++) {
          await DB.prepare(
            'INSERT OR IGNORE INTO numeros_rifa (id) VALUES (?)'
          ).bind(i).run();
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Base de datos inicializada con 100 números'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Base de datos ya existe'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Error inicializando DB'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Ruta no encontrada
  return new Response(JSON.stringify({
    success: false,
    error: 'Ruta no encontrada'
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}