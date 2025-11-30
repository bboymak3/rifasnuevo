export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    
    const ordenes = await db.prepare(`
      SELECT 
        id, 
        cliente_nombre as nombre,
        cliente_telefono as telefono,  
        cliente_email as email,
        ticket_id,                    -- ← Mantener el nombre original
        total, 
        metodo_pago, 
        comprobante, 
        estado, 
        fecha_creacion
      FROM ordenes 
      ORDER BY fecha_creacion DESC
    `).all();

    // Procesar para formatear los tickets
    const ordenesFormateadas = ordenes.results.map(orden => {
      return {
        ...orden,
        tickets: orden.ticket_id || 'No especificado'  // ← Formatear aquí
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        ordenes: ordenesFormateadas
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