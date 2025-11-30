export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    
    const vendidos = await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE vendido = 1').first();
    const disponibles = await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE vendido = 0').first();
    const recaudado = await db.prepare('SELECT SUM(total) as sum FROM ordenes WHERE estado = "pendiente"').first();

    return new Response(JSON.stringify({
      success: true,
      data: {
        vendidos: vendidos.count,
        disponibles: disponibles.count,
        recaudado: recaudado.sum || 0
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