export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    console.log('=== INICIANDO PROCESAR-PAGO ===');
    
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    console.log('Datos recibidos:', { rifaId, tickets, nombre, telefono, total });

    const db = env.DB;

    // 1. VERIFICAR TICKETS DISPONIBLES
    const placeholders = tickets.map(() => '?').join(',');
    console.log('Verificando tickets:', tickets);
    
    const vendidos = await db.prepare(
      `SELECT COUNT(*) as count FROM tickets WHERE numero IN (${placeholders}) AND vendido = 1`
    ).bind(...tickets).first();

    console.log('Tickets ya vendidos:', vendidos.count);

    if (vendidos.count > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Algunos tickets ya están vendidos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. CREAR LA ORDEN
    console.log('Creando orden...');
    const orden = await db.prepare(
      `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado, total, metodo_pago, comprobante)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`
    ).bind(
      tickets.join(','),  // ticket_id
      nombre,             // cliente_nombre
      telefono,           // cliente_telefono
      email || '',        // cliente_email
      parseInt(rifaId),   // rifa_id
      parseFloat(total),  // total
      metodoPago,         // metodo_pago
      comprobante         // comprobante
    ).run();

    const ordenId = orden.meta.last_row_id;
    console.log('✅ Orden creada con ID:', ordenId);

    // 3. ACTUALIZAR TICKETS
    console.log('Actualizando tickets...');
    const updateResult = await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId, ...tickets).run();

    console.log('✅ Tickets actualizados. Filas afectadas:', updateResult.meta.changes);

    // 4. ÉXITO
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