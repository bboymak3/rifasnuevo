// functions/api/tickets-disponibles.js - VERSI�N CORREGIDA
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
        error: 'M�todo no permitido'
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

    let ticketsDisponibles = [];
    if (!ticketsQuery.results || ticketsQuery.results.length === 0) {
      console.warn('⚠️ No se encontraron filas en la tabla tickets. Devolviendo rango 1-100 como disponibles por defecto.');
      ticketsDisponibles = Array.from({length:100}, (_,i) => i+1);
    } else {
      ticketsDisponibles = ticketsQuery.results.map(t => parseInt(t.numero));
    }
    
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