export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Obtener todas las solicitudes de recarga con información de usuario
    const solicitudes = await db.prepare(`
      SELECT 
        r.*,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        u.telefono as usuario_telefono
      FROM recargas r
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY r.fecha_solicitud DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: { solicitudes: solicitudes.results }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}