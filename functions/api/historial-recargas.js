// functions/api/historial-recargas.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const usuario_id = url.searchParams.get('usuario_id');
  
  // Configurar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método no permitido' 
      }),
      {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }

  try {
    if (!usuario_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Se requiere usuario_id' 
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    const db = env.DB;
    
    // Obtener historial de recargas del usuario
    const recargas = await db
      .prepare(`
        SELECT 
          id, monto, creditos_solicitados, metodo_pago, 
          referencia_pago, estado, fecha_solicitud, fecha_procesado
        FROM recargas 
        WHERE usuario_id = ?
        ORDER BY fecha_solicitud DESC
        LIMIT 20
      `)
      .bind(usuario_id)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        recargas: recargas.results || []
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );

  } catch (error) {
    console.error('💥 ERROR en historial-recargas:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
}