export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Verificar que request existe
    if (!request) {
      throw new Error('Request is undefined');
    }
    
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    // Verificar datos mínimos requeridos
    if (!tickets || !nombre || !telefono) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Faltan datos requeridos: tickets, nombre o teléfono'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;

    // Verificar tickets disponibles
    const placeholders = tickets.map(() => '?').join(',');
    const vendidos = await db.prepare(
      `SELECT COUNT(*) as count FROM tickets WHERE numero IN (${placeholders}) AND vendido = 1`
    ).bind(...tickets).first();

    if (vendidos.count > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Algunos tickets ya están vendidos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear la orden
    const orden = await db.prepare(
      `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`
    ).bind(
      tickets.join(','),
      nombre, 
      telefono, 
      email || '', 
      parseInt(rifaId) || 140  // Valor por defecto si es necesario
    ).run();

    const ordenId = orden.meta.last_row_id;

    // Actualizar tickets
    await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId, ...tickets).run();

    return new Response(JSON.stringify({
      success: true,
      orderId: ordenId
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    // Error más detallado
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno: ' + error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}