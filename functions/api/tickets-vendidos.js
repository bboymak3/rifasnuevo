 
export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    
    const tickets = await db.prepare(`
      SELECT t.numero, o.nombre, o.telefono, o.fecha_creacion
      FROM tickets t
      JOIN ordenes o ON t.orden_id = o.id
      WHERE t.vendido = 1
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