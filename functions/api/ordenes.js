export async function onRequest(context) {
  const { env } = context;
  
  try {
    const db = env.DB;
    
    // Obtener todas las órdenes
    const ordenes = await db.prepare(`
      SELECT 
        id, 
        usuario_id,
        nombre,
        telefono,  
        email,
        tickets,
        cantidad_tickets,
        total_creditos,
        total_bs,
        metodo_pago, 
        estado, 
        fecha_creacion
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