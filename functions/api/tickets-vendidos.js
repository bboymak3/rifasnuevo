export async function onRequest(context) {
  const { env } = context;
  
  try {
    const db = env.DB;
    
    // Obtener tickets vendidos - JOIN con ordenes para obtener información del comprador
    const tickets = await db.prepare(`
      SELECT 
        t.numero,
        o.nombre,
        o.telefono,
        o.fecha_creacion
      FROM tickets t
      LEFT JOIN ordenes o ON t.orden_id = o.id
      WHERE t.estado = 'vendido' 
      OR t.nombre IS NOT NULL
      OR t.usuario_id IS NOT NULL
      ORDER BY o.fecha_creacion DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        tickets: tickets.results
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