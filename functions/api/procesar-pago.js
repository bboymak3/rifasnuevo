 
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    const db = env.DB;

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

    const ordenId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO ordenes (id, rifa_id, nombre, telefono, email, tickets, total, metodo_pago, comprobante, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`
    ).bind(ordenId, rifaId, nombre, telefono, email || '', tickets.join(','), total, metodoPago, comprobante).run();

    await db.prepare(
      `UPDATE tickets SET vendido = 1, orden_id = ? WHERE numero IN (${placeholders})`
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