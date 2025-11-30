 
export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    
    const tickets = await db.prepare(`
      SELECT numero 
      FROM tickets 
      WHERE vendido = 0 
      ORDER BY numero ASC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        disponibles: tickets.results.map(t => t.numero)
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