export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    console.log('🔍 DEBUG - Iniciando procesar-pago...');
    
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    console.log('🔍 DEBUG - Datos recibidos:', { 
      rifaId, 
      tickets, 
      nombre, 
      telefono, 
      email,
      metodoPago,
      comprobante,
      total 
    });

    const db = env.DB;

    // 1. Verificar tickets disponibles
    const placeholders = tickets.map(() => '?').join(',');
    console.log('🔍 DEBUG - Consulta verificando tickets:', `SELECT COUNT(*) as count FROM tickets WHERE numero IN (${placeholders}) AND vendido = 1`);
    
    const vendidos = await db.prepare(
      `SELECT COUNT(*) as count FROM tickets WHERE numero IN (${placeholders}) AND vendido = 1`
    ).bind(...tickets).first();

    console.log('🔍 DEBUG - Tickets vendidos encontrados:', vendidos.count);

    if (vendidos.count > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Algunos tickets ya están vendidos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Crear la orden
    console.log('🔍 DEBUG - Creando orden en la base de datos...');
    
    const insertQuery = `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado, total, metodo_pago, comprobante)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`;
    
    console.log('🔍 DEBUG - Query INSERT:', insertQuery);
    console.log('🔍 DEBUG - Valores:', [
      tickets.join(','),
      nombre,
      telefono,
      email || '',
      parseInt(rifaId),
      parseFloat(total),
      metodoPago,
      comprobante
    ]);

    const orden = await db.prepare(insertQuery).bind(
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
    console.log('✅ DEBUG - Orden creada con ID:', ordenId);

    // 3. Verificar que la orden se creó correctamente
    const ordenCreada = await db.prepare('SELECT * FROM ordenes WHERE id = ?').bind(ordenId).first();
    console.log('✅ DEBUG - Orden verificada:', ordenCreada);

    if (!ordenCreada) {
      throw new Error(`No se pudo verificar la orden creada con ID: ${ordenId}`);
    }

    // 4. Actualizar tickets
    console.log('🔍 DEBUG - Actualizando tickets...');
    console.log('🔍 DEBUG - Query UPDATE:', `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`);
    console.log('🔍 DEBUG - Valores UPDATE:', [ordenId, ...tickets]);

    const updateResult = await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId, ...tickets).run();

    console.log('✅ DEBUG - Tickets actualizados. Filas afectadas:', updateResult.meta.changes);

    // 5. Verificar que los tickets se actualizaron
    const ticketsActualizados = await db.prepare(
      `SELECT numero, vendido, order_id FROM tickets WHERE numero IN (${placeholders})`
    ).bind(...tickets).all();

    console.log('✅ DEBUG - Tickets después de actualizar:', ticketsActualizados.results);

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
    console.error('❌ ERROR CRÍTICO en procesar-pago:');
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    
    // Error más detallado para debugging
    return new Response(JSON.stringify({
      success: false,
      error: 'Error del servidor: ' + error.message,
      debug: {
        message: error.message,
        stack: error.stack
      }
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}