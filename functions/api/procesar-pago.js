export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

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

    // ✅ NO usar crypto.randomUUID() - id es AUTOINCREMENT
    // ✅ INSERT adaptado a la estructura REAL
    const orden = await db.prepare(
      `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`
    ).bind(
      tickets.join(','),  // ticket_id (guardar todos los tickets como string)
      nombre, 
      telefono, 
      email || '', 
      parseInt(rifaId)     // rifa_id
    ).run();

    // ✅ Obtener el ID generado automáticamente
    const ordenId = orden.meta.last_row_id;

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
    return new Response(JSON.stringify({
      success: false,
      error: 'Error: ' + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}