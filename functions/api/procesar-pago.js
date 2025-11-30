export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email, metodoPago, comprobante, total } = body;

    console.log('🔍 DEBUG - Datos recibidos:', { rifaId, tickets, nombre, telefono });

    const db = env.DB;

    // 1. Verificar tickets disponibles
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

    // 2. Crear la orden PRIMERO
    console.log('🔍 DEBUG - Creando orden...');
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

    // 3. Obtener ID de la orden (IMPORTANTE: convertir a string si es necesario)
    const ordenId = orden.meta.last_row_id;
    console.log('✅ DEBUG - Orden creada con ID:', ordenId, 'Tipo:', typeof ordenId);

    // 4. VERIFICAR que la orden existe antes de actualizar tickets
    const ordenVerificada = await db.prepare(
      'SELECT id FROM ordenes WHERE id = ?'
    ).bind(ordenId).first();

    if (!ordenVerificada) {
      throw new Error(`No se pudo encontrar la orden con ID: ${ordenId}`);
    }

    console.log('✅ DEBUG - Orden verificada:', ordenVerificada);

    // 5. ACTUALIZAR tickets - asegurando tipos de datos correctos
    console.log('🔍 DEBUG - Actualizando tickets...');
    
    // Si order_id espera INTEGER, convertir ordenId a número
    // Si order_id espera TEXT, convertir ordenId a string
    const updateResult = await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId.toString(), ...tickets).run(); // ← .toString() para asegurar tipo texto

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