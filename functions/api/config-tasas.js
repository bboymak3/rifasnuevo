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
    
    // ✅ CORREGIDO: Sin parámetros, no necesita .bind()
    const tasas = await db.prepare(
      'SELECT * FROM config_tasas ORDER BY tipo'
    ).all();

    console.log('Tasas encontradas:', tasas.results?.length || 0);
    
    return new Response(JSON.stringify({
      success: true,
      data: { tasas: tasas.results || [] }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });

  } catch (error) {
    console.error('Error en config-tasas:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}