export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('Compra recibida:', body);
    
    const { userId, nombre, telefono, email, tickets, totalCreditos } = body;
    
    if (!userId || !nombre || !telefono || !tickets || !totalCreditos) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Verificar créditos del usuario
    const usuario = await db.prepare(
      'SELECT creditos FROM usuarios WHERE id = ?'
    ).bind(userId).first();

    if (!usuario) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuario no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (usuario.creditos < totalCreditos) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Créditos insuficientes' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar que los tickets estén disponibles
    const ticketsArray = tickets.split(',').map(t => t.trim());
    
    // Verificar disponibilidad de cada ticket
    for (const ticketNum of ticketsArray) {
      const ticketExistente = await db.prepare(
        'SELECT id FROM tickets WHERE numero = ?'
      ).bind(ticketNum).first();
      
      if (ticketExistente) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `El ticket ${ticketNum} ya está vendido` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Calcular monto en Bs (para registro)
    const tasa = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('rifa_ticket').first();

    const precioPorTicket = tasa ? tasa.valor : 100;
    const montoBs = (totalCreditos * 250) / 100; // Convertir créditos a Bs (basado en tasa 250Bs = 100 créditos)

    // Iniciar transacción
    try {
      // 1. Descontar créditos del usuario
      await db.prepare(
        'UPDATE usuarios SET creditos = creditos - ? WHERE id = ?'
      ).bind(totalCreditos, userId).run();
      
      // 2. Crear orden de compra
      const ordenResult = await db.prepare(
        `INSERT INTO ordenes (usuario_id, nombre, telefono, email, tickets, total_creditos, total_bs, metodo_pago, estado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'creditos', 'verificado')`
      ).bind(userId, nombre, telefono, email || '', tickets, totalCreditos, montoBs).run();
      
      const ordenId = ordenResult.meta.last_row_id;
      
      // 3. Asignar tickets al usuario
      for (const ticketNum of ticketsArray) {
        await db.prepare(
          `INSERT INTO tickets (numero, orden_id, usuario_id, nombre, telefono, estado) 
           VALUES (?, ?, ?, ?, ?, 'vendido')`
        ).bind(ticketNum, ordenId, userId, nombre, telefono).run();
      }
      
      console.log('✅ Compra procesada exitosamente');
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          ordenId: ordenId,
          ticketsAsignados: ticketsArray,
          creditosRestantes: usuario.creditos - totalCreditos,
          totalCreditos: totalCreditos
        },
        redirect: `/compra-exitosa.html?orden=${ordenId}&tickets=${tickets}`
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (transaccionError) {
      console.error('Error en transacción:', transaccionError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error en transacción: ' + transaccionError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error procesando compra:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}