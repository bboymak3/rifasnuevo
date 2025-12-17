// /functions/api/puntos.js
export async function onRequest(context) {
  const { request, env, user } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Obtener puntos del usuario actual
  if (path === '/api/usuario/puntos' && request.method === 'GET') {
    try {
      // Verificar autenticación
      if (!user || !user.id) {
        return new Response(JSON.stringify({
          error: 'No autorizado'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const usuario = await DB.prepare(
        'SELECT puntos FROM usuarios WHERE id = ?'
      ).bind(user.id).first();
      
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
        error: 'Error al obtener puntos',
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