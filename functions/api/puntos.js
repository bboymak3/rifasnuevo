// puntos.js - Obtener puntos del usuario
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path === '/api/usuario/puntos' && request.method === 'GET') {
    try {
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
      
      const usuario = await DB.prepare(
        'SELECT puntos FROM usuarios WHERE id = ?'
      ).bind(userId).first();
      
      if (!usuario) {
        return new Response(JSON.stringify({
          error: 'Usuario no encontrado'
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        puntos: usuario.puntos
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error obteniendo puntos',
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