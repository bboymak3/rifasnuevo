// functions/api/estadisticas.js
export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (context.request.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Método no permitido'
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  try {
    const db = context.env.DB;
    
    // Estadísticas de tickets
    const ticketsStats = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN vendido = 1 THEN 1 ELSE 0 END) as vendidos,
        SUM(CASE WHEN vendido = 0 THEN 1 ELSE 0 END) as disponibles
      FROM tickets
    `).first();

    // Total recaudado
    const recaudadoResult = await db.prepare(`
      SELECT COALESCE(SUM(total_creditos), 0) as recaudado
      FROM compras
    `).first();

    return new Response(
      JSON.stringify({
        success: true,
        estadisticas: {
          tickets: {
            total: ticketsStats.total || 100, // Siempre 100 tickets
            vendidos: ticketsStats.vendidos || 0,
            disponibles: ticketsStats.disponibles || 100
          },
          recaudado: recaudadoResult.recaudado || 0
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('Error en estadísticas:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error obteniendo estadísticas'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
}