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
    
    console.log('Historial recargas para userId:', userId);
    
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
    
    // ✅ CORREGIDO: Usar .bind()
    const recargas = await db.prepare(
      'SELECT * FROM recargas WHERE usuario_id = ? ORDER BY fecha_solicitud DESC'
    ).bind(userId).all();

    console.log('Recargas encontradas:', recargas.results?.length || 0);
    
    return new Response(JSON.stringify({
      success: true,
      data: { recargas: recargas.results || [] }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });

  } catch (error) {
    console.error('Error en historial-recargas:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}