// Endpoints para gestion de rifas 
// /functions/api/rifa.js
export async function onRequest(context) {
  const { request, env, user } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Obtener todos los números
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
        error: 'Error al obtener números',
        details: error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Comprar un número
  if (path === '/api/rifa/comprar' && request.method === 'POST') {
    try {
      // Verificar que el usuario está autenticado
      if (!user || !user.id) {
        return new Response(JSON.stringify({
          error: 'No autorizado'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
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
      
      // Iniciar transacción
      const transaction = await DB.batch([
        DB.prepare('SELECT estado, usuario_id FROM numeros_rifa WHERE id = ?')
          .bind(numeroId),
        
        DB.prepare('SELECT puntos FROM usuarios WHERE id = ?')
          .bind(user.id),
        
        DB.prepare('SELECT id FROM numeros_rifa WHERE id = ? AND usuario_id = ?')
          .bind(numeroId, user.id)
      ]);
      
      const [numeroResult, usuarioResult, propiedadResult] = transaction;
      const numero = numeroResult.results[0];
      const usuario = usuarioResult.results[0];
      const yaEsPropietario = propiedadResult.results.length > 0;
      
      if (!numero) {
        return new Response(JSON.stringify({
          error: 'Número no encontrado'
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (numero.estado === 'vendido' && !yaEsPropietario) {
        return new Response(JSON.stringify({
          error: 'Este número ya está vendido'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (yaEsPropietario) {
        return new Response(JSON.stringify({
          error: 'Ya eres el dueño de este número'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
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
      
      // Realizar la compra
      const compraTransaction = await DB.batch([
        DB.prepare(`
          UPDATE numeros_rifa 
          SET estado = 'vendido', usuario_id = ?, comprado_en = datetime('now')
          WHERE id = ?
        `).bind(user.id, numeroId),
        
        DB.prepare(`
          UPDATE usuarios 
          SET puntos = puntos - ? 
          WHERE id = ?
        `).bind(puntosRequeridos, user.id),
        
        DB.prepare(`
          INSERT INTO transacciones (usuario_id, tipo, puntos, descripcion)
          VALUES (?, 'compra', ?, ?)
        `).bind(user.id, -puntosRequeridos, `Compra del número ${numeroId} de la rifa`)
      ]);
      
      // Obtener datos actualizados
      const numeroActualizado = await DB.prepare(
        'SELECT * FROM numeros_rifa WHERE id = ?'
      ).bind(numeroId).first();
      
      const usuarioActualizado = await DB.prepare(
        'SELECT puntos FROM usuarios WHERE id = ?'
      ).bind(user.id).first();
      
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
  
  // Ruta no encontrada
  return new Response(JSON.stringify({
    error: 'Ruta no encontrada'
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}