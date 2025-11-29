export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    console.log('Datos recibidos:', { rifaId, tickets, nombre, telefono, metodoPago, total });

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
      tickets.join(','),  // ticket_id
      nombre, 
      telefono, 
      email || '', 
      parseInt(rifaId)     // rifa_id
    ).run();

    // Obtener el ID generado automáticamente
    const ordenId = orden.meta.last_row_id;
    console.log('Orden ID generado:', ordenId);

    // ✅ VERIFICAR que la orden se creó
    const ordenCreada = await db.prepare('SELECT * FROM ordenes WHERE id = ?').bind(ordenId).first();
    console.log('Orden creada:', ordenCreada);

    if (!ordenCreada) {
      throw new Error('No se pudo crear la orden en la base de datos');
    }

    // Actualizar los tickets
    await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId, ...tickets).run();

    console.log('Tickets actualizados correctamente');

    return new Response(JSON.stringify({
      success: true,
      orderId: ordenId,
      message: 'Compra procesada exitosamente'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error en procesar-pago:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Error del servidor: ' + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}