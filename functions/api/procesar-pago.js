export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Verificar que request existe
    if (!request) {
      throw new Error('Request is undefined');
    }
    
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    console.log('🔍 DEBUG - Datos recibidos:', { 
      rifaId, 
      tickets, 
      nombre, 
      telefono, 
      metodoPago, 
      total 
    });

    const db = env.DB;

    // Verificar que DB existe
    if (!db) {
      throw new Error('Database connection (DB) is undefined');
    }

    // 1. Verificar tickets disponibles
    const placeholders = tickets.map(() => '?').join(',');
    console.log('🔍 DEBUG - Placeholders:', placeholders);
    console.log('🔍 DEBUG - Tickets a verificar:', tickets);

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
      tickets.join(','),  // ticket_id
      nombre,             // cliente_nombre
      telefono,           // cliente_telefono
      email || '',        // cliente_email
      parseInt(rifaId),   // rifa_id
      total,              // total
      metodoPago,         // metodo_pago
      comprobante         // comprobante
    ).run();

    // 3. Obtener ID de la orden
    const ordenId = orden.meta.last_row_id;
    console.log('✅ DEBUG - Orden creada con ID:', ordenId);

    // 4. Marcar tickets como vendidos
    console.log('🔍 DEBUG - Marcando tickets como vendidos...');
    await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId, ...tickets).run();

    console.log('✅ DEBUG - Tickets actualizados correctamente');

    // 5. Éxito
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
      error: 'Error interno del servidor: ' + error.message,
      stack: error.stack // Solo para desarrollo
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}