export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    // AGREGAR ESTOS CONSOLE.LOG PARA DEBUG
    console.log('🔍 DEBUG - Datos recibidos:', JSON.stringify(body, null, 2));
    console.log('🔍 DEBUG - Tickets recibidos:', tickets);
    console.log('🔍 DEBUG - Tipo de tickets:', typeof tickets, Array.isArray(tickets));
    console.log('🔍 DEBUG - Cantidad de tickets:', tickets?.length);

    // VALIDACIÓN CRÍTICA DE TICKETS
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      console.log('❌ ERROR: Tickets inválidos o vacíos');
      return new Response(JSON.stringify({
        success: false,
        error: 'No se seleccionaron tickets válidos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;

    // 1. Verificar tickets disponibles
    const placeholders = tickets.map(() => '?').join(',');
    console.log('🔍 DEBUG - Placeholders:', placeholders);
    
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
    console.log('🔍 DEBUG - Creando orden...');
    const orden = await db.prepare(
      `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado, total, metodo_pago, comprobante)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`
    ).bind(
      tickets.join(','),  // Esto guarda los tickets como string
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

    // 3. Actualizar tickets
    console.log('🔍 DEBUG - Actualizando tickets...');
    const updateResult = await db.prepare(
      `UPDATE tickets SET vendido = 1, orden_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId.toString(), ...tickets).run();

    console.log('✅ DEBUG - Tickets actualizados. Filas afectadas:', updateResult.meta.changes);

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
    console.error('❌ Stack trace:', error.stack);
    
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