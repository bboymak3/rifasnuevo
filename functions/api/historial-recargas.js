export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Falta parámetro: userId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Obtener historial de recargas del usuario
    const recargas = await db.prepare(`
      SELECT r.* FROM recargas r
      WHERE r.usuario_id = ?
      ORDER BY r.fecha_solicitud DESC
    `).all(userId);

    return new Response(JSON.stringify({
      success: true,
      data: { recargas: recargas.results }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}