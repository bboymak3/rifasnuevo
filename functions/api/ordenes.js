 
export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    
    const ordenes = await db.prepare(`
      SELECT id, nombre, telefono, email, tickets, total, metodo_pago, comprobante, estado, fecha_creacion
      FROM ordenes 
      ORDER BY fecha_creacion DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        ordenes: ordenes.results
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