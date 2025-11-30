export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { rifaId, tickets, nombre, telefono, email } = body;

    console.log('Datos recibidos para procesar pago:', { rifaId, tickets, nombre, telefono });

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

    // 2. Crear la orden - SOLO con columnas que EXISTEN
    const orden = await db.prepare(
      `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`
    ).bind(
      tickets.join(','),  // ticket_id
      nombre,             // cliente_nombre
      telefono,           // cliente_telefono
      email || '',        // cliente_email
      parseInt(rifaId)    // rifa_id
    ).run();

    // 3. Obtener ID de la orden
    const ordenId = orden.meta.last_row_id;
    console.log('Orden creada con ID:', ordenId);

    // 4. Marcar tickets como vendidos
    await db.prepare(
      `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId, ...tickets).run();

    console.log('Tickets actualizados correctamente');

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
    console.error('Error en procesar-pago:', error);
    
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