export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    // VALIDACIÓN CRÍTICA DE TICKETS
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '❌ No se seleccionaron tickets válidos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;

    // 1. Verificar tickets disponibles
    const placeholders = tickets.map(() => '?').join(',');
    
    const vendidos = await db.prepare(
      `SELECT COUNT(*) as count FROM tickets WHERE numero IN (${placeholders}) AND vendido = 1`
    ).bind(...tickets).first();

    if (vendidos.count > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `❌ ${vendidos.count} tickets ya están vendidos`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. PRIMERO actualizar los tickets (sin orden_id)
    const updateResult = await db.prepare(
      `UPDATE tickets SET vendido = 1 WHERE numero IN (${placeholders})`
    ).bind(...tickets).run();

    // 3. LUEGO crear la orden
    const orden = await db.prepare(
      `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado, total, metodo_pago, comprobante)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`
    ).bind(
      tickets.join(','),
      nombre,
      telefono,
      email || '',
      parseInt(rifaId),
      parseFloat(total),
      metodoPago,
      comprobante
    ).run();

    const ordenId = orden.meta.last_row_id;

    // 4. FINALMENTE actualizar los tickets con el orden_id
    await db.prepare(
      `UPDATE tickets SET orden_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId.toString(), ...tickets).run();

    return new Response(JSON.stringify({
      success: true,
      orderId: ordenId,
      message: '✅ Compra procesada exitosamente'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ ERROR en procesar-pago:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: '❌ Error interno: ' + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}