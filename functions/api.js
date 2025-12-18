// functions/api.js - Sistema completo de rifas
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  console.log(\`📨 \${request.method} \${pathname}\`);
  
  // ========== 1. GET NÚMEROS (con creación automática) ==========
  if (pathname === '/api/numeros' && request.method === 'GET') {
    try {
      // Verificar si tabla numeros_rifa existe
      const tableExists = await DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='numeros_rifa'"
      ).first();
      
      // Si no existe, crearla
      if (!tableExists) {
        console.log('📦 Creando tabla numeros_rifa...');
        
        // Crear tabla
        await DB.exec(\`
          CREATE TABLE numeros_rifa (
            id INTEGER PRIMARY KEY,
            estado TEXT DEFAULT 'disponible',
            telefono_comprador TEXT,
            banco TEXT,
            fecha_compra DATETIME
          )
        \`);
        
        // Insertar números 1-100
        const inserts = [];
        for (let i = 1; i <= 100; i++) {
          inserts.push(
            DB.prepare('INSERT INTO numeros_rifa (id) VALUES (?)').bind(i)
          );
        }
        
        // Ejecutar todos los inserts
        await DB.batch(inserts);
        console.log('✅ Tabla numeros_rifa creada con 100 números');
      }
      
      // Obtener todos los números
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
      console.error('❌ Error en /api/numeros:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Error cargando números'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ========== 2. MARCAR NÚMERO COMO VENDIDO ==========
  if (pathname === '/api/marcar-vendido' && request.method === 'POST') {
    try {
      // Verificar autorización admin
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
      
      // Obtener datos
      const data = await request.json();
      const { numeroId, telefono, banco } = data;
      
      if (!numeroId || numeroId < 1 || numeroId > 100) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Número inválido (debe ser 1-100)'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar que el número existe
      const numeroExiste = await DB.prepare(
        'SELECT id FROM numeros_rifa WHERE id = ?'
      ).bind(numeroId).first();
      
      if (!numeroExiste) {
        // Si no existe, crearlo
        await DB.prepare(
          'INSERT INTO numeros_rifa (id, estado, telefono_comprador, banco, fecha_compra) VALUES (?, ?, ?, ?, datetime("now"))'
        ).bind(numeroId, 'vendido', telefono || '', banco || '').run();
      } else {
        // Si existe, actualizarlo
        await DB.prepare(
          \`UPDATE numeros_rifa 
           SET estado = 'vendido', 
               telefono_comprador = ?, 
               banco = ?,
               fecha_compra = datetime('now')
           WHERE id = ?\`
        ).bind(telefono || '', banco || '', numeroId).run();
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: \`Número \${numeroId} marcado como vendido\`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('❌ Error en /api/marcar-vendido:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Error marcando número'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ========== 3. REINICIAR NÚMERO (marcar como disponible) ==========
  if (pathname === '/api/reiniciar-numero' && request.method === 'POST') {
    try {
      // Verificar autorización admin
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
      
      const { numeroId } = await request.json();
      
      await DB.prepare(
        \`UPDATE numeros_rifa 
         SET estado = 'disponible', 
             telefono_comprador = NULL, 
             banco = NULL,
             fecha_compra = NULL
         WHERE id = ?\`
      ).bind(numeroId).run();
      
      return new Response(JSON.stringify({
        success: true,
        message: \`Número \${numeroId} marcado como disponible\`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Error reiniciando número'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ========== 4. ENDPOINT DE PRUEBA/DIAGNÓSTICO ==========
  if (pathname === '/api/debug' && request.method === 'GET') {
    try {
      // Verificar tablas existentes
      const tables = await DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all();
      
      // Contar números en numeros_rifa
      let numerosCount = 0;
      let numerosDisponibles = 0;
      
      const numerosRifaExists = tables.results.some(t => t.name === 'numeros_rifa');
      if (numerosRifaExists) {
        const countResult = await DB.prepare(
          'SELECT COUNT(*) as total, SUM(CASE WHEN estado = "disponible" THEN 1 ELSE 0 END) as disponibles FROM numeros_rifa'
        ).first();
        numerosCount = countResult.total || 0;
        numerosDisponibles = countResult.disponibles || 0;
      }
      
      return new Response(JSON.stringify({
        success: true,
        debug: {
          tablas_existentes: tables.results,
          numeros_rifa: {
            existe: numerosRifaExists,
            total: numerosCount,
            disponibles: numerosDisponibles,
            vendidos: numerosCount - numerosDisponibles
          },
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Debug error: ' + error.message
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