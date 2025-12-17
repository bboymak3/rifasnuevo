// rifa.js - Gestión de números de rifa
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // GET todos los números
  if (path === '/api/rifa/numeros' && request.method === 'GET') {
    try {
      const numeros = await DB.prepare(
        `SELECT n.id, n.estado, n.usuario_id, n.comprado_en,
                u.email as usuario_email, u.nombre as usuario_nombre
         FROM numeros_rifa n
         LEFT JOIN usuarios u ON n.usuario_id = u.id
         ORDER BY n.id`
      ).all();
      
      return new Response(JSON.stringify({
        success: true,
        numeros: numeros.results
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error obteniendo números',
        details: error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // POST comprar número
  if (path === '/api/rifa/comprar' && request.method === 'POST') {
    try {
      const data = await request.json();
      const { numeroId, puntosRequeridos = 10 } = data;
      
      if (!numeroId) {
        return new Response(JSON.stringify({
          error: 'ID de número requerido'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Extraer usuario ID del token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer token_')) {
        return new Response(JSON.stringify({
          error: 'No autorizado'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const userId = authHeader.replace('Bearer token_', '');
      
      // Verificar número disponible
      const numero = await DB.prepare(
        'SELECT estado, usuario_id FROM numeros_rifa WHERE id = ?'
      ).bind(numeroId).first();
      
      if (!numero) {
        return new Response(JSON.stringify({
          error: 'Número no encontrado'
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (numero.estado === 'vendido') {
        return new Response(JSON.stringify({
          error: 'Este número ya está vendido'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar puntos del usuario
      const usuario = await DB.prepare(
        'SELECT puntos FROM usuarios WHERE id = ?'
      ).bind(userId).first();
      
      if (!usuario || usuario.puntos < puntosRequeridos) {
        return new Response(JSON.stringify({
          error: 'Puntos insuficientes',
          puntosDisponibles: usuario?.puntos || 0,
          puntosRequeridos: puntosRequeridos
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Realizar compra
      await DB.batch([
        DB.prepare(`
          UPDATE numeros_rifa 
          SET estado = 'vendido', usuario_id = ?, comprado_en = datetime('now')
          WHERE id = ?
        `).bind(userId, numeroId),
        
        DB.prepare(`
          UPDATE usuarios 
          SET puntos = puntos - ? 
          WHERE id = ?
        `).bind(puntosRequeridos, userId),
        
        DB.prepare(`
          INSERT INTO transacciones (usuario_id, tipo, puntos, descripcion)
          VALUES (?, 'compra', ?, ?)
        `).bind(userId, -puntosRequeridos, `Compra del número ${numeroId}`)
      ]);
      
      const numeroActualizado = await DB.prepare(
        'SELECT * FROM numeros_rifa WHERE id = ?'
      ).bind(numeroId).first();
      
      const usuarioActualizado = await DB.prepare(
        'SELECT puntos FROM usuarios WHERE id = ?'
      ).bind(userId).first();
      
      return new Response(JSON.stringify({
        success: true,
        message: `Número ${numeroId} comprado exitosamente`,
        numero: numeroActualizado,
        puntosRestantes: usuarioActualizado.puntos
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error en la compra',
        details: error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return new Response(JSON.stringify({
    error: 'Ruta no encontrada'
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}