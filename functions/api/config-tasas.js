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
    
    // Obtener todas las tasas configuradas
    const tasas = await db.prepare(`
      SELECT * FROM config_tasas 
      ORDER BY tipo
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: { tasas: tasas.results }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error obteniendo tasas:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}