export async function onRequest(context) {
  const { env } = context;
  
  try {
    const db = env.DB;
    
    // Obtener tickets disponibles (estado = 'disponible' y no tienen usuario asignado)
    const tickets = await db.prepare(`
      SELECT numero 
      FROM tickets 
      WHERE (estado = 'disponible' OR estado IS NULL)
      AND (usuario_id IS NULL OR usuario_id = 0)
      AND (nombre IS NULL OR nombre = '')
      ORDER BY CAST(numero AS INTEGER) ASC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        disponibles: tickets.results.map(t => parseInt(t.numero))
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}