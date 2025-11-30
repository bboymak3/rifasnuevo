export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { telefono } = body;

    if (!telefono) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Teléfono es requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;

    // Buscar órdenes por teléfono (sin importar formato)
    const ordenes = await db.prepare(`
      SELECT 
        id, 
        cliente_nombre as nombre,
        cliente_telefono as telefono,  
        cliente_email as email,
        ticket_id as tickets,
        total, 
        metodo_pago, 
        comprobante, 
        estado, 
        fecha_creacion
      FROM ordenes 
      WHERE cliente_telefono LIKE ?
      ORDER BY fecha_creacion DESC
    `).bind(`%${telefono}%`).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        ordenes: ordenes.results,
        total: ordenes.results.length
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error en buscar-ordenes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}