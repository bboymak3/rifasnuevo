// functions/api/tickets-disponibles.js - VERSIÓN CORREGIDA
export async function onRequest(context) {
  // Configurar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Manejar preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Solo aceptar GET
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
    
    console.log('?? Obteniendo tickets disponibles...');

    // Obtener tickets disponibles (vendido = 0 y sin userId)
    const ticketsQuery = await db.prepare(`
      SELECT numero, vendido, userId
      FROM tickets 
      WHERE vendido = 0
      ORDER BY CAST(numero AS INTEGER) ASC
    `).all();

    const ticketsDisponibles = ticketsQuery.results.map(t => parseInt(t.numero));
    
    console.log(`? ${ticketsDisponibles.length} tickets disponibles encontrados`);

    return new Response(
      JSON.stringify({
        success: true,
        disponibles: ticketsDisponibles,
        total: ticketsDisponibles.length
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('?? ERROR en tickets-disponibles:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error obteniendo tickets disponibles',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
}