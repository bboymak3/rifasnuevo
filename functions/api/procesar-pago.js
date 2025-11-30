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

    // 2. CREAR LA ORDEN - SIN DEPENDER DE 'id'
    console.log('Creando orden...');
    
    // Usar un ID temporal (podría ser un timestamp o UUID simple)
    const ordenIdTemp = Date.now().toString();
    
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

    console.log('✅ Orden creada');

    // 3. OBTENER EL ID REAL (si la tabla tiene AUTOINCREMENT)
    // Buscar la orden recién creada por los datos únicos
    const ordenCreada = await db.prepare(
      'SELECT * FROM ordenes WHERE ticket_id = ? AND cliente_nombre = ? AND cliente_telefono = ? ORDER BY fecha_creacion DESC LIMIT 1'
    ).bind(tickets.join(','), nombre, telefono).first();

    if (!ordenCreada) {
      throw new Error('No se pudo encontrar la orden creada');
    }

    const ordenId = ordenCreada.id || ordenIdTemp;
    console.log('✅ ID de orden:', ordenId);

    // 4. MARCAR TICKETS COMO VENDIDOS
    console.log('Actualizando tickets...');
    await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId, ...tickets).run();

    console.log('✅ Tickets actualizados');

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