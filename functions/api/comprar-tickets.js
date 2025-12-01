export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('=== COMPRA CON CRÉDITOS ===');
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('📦 Datos recibidos:', body);
    
    const { userId, nombre, telefono, email, tickets, totalCreditos } = body;
    
    // Validación
    if (!userId || !nombre || !telefono || !tickets || !totalCreditos) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan datos: userId, nombre, telefono, tickets, totalCreditos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // 1. Verificar usuario
    console.log(`👤 Verificando usuario ID: ${userId}`);
    const usuario = await db.prepare(
      'SELECT id, nombre, creditos FROM usuarios WHERE id = ?'
    ).bind(userId).first();

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuario no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Usuario: ${usuario.nombre}, Créditos: ${usuario.creditos}`);
    
    // 2. Verificar créditos
    if (usuario.creditos < totalCreditos) {
      console.log(`❌ Créditos insuficientes: ${usuario.creditos} < ${totalCreditos}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Créditos insuficientes. Tienes ${usuario.creditos} créditos, necesitas ${totalCreditos}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Procesar tickets
    const ticketsArray = tickets.split(',').map(t => t.trim()).filter(t => t !== '');
    console.log(`🎫 Tickets a comprar: ${ticketsArray.length} - ${ticketsArray.join(', ')}`);
    
    if (ticketsArray.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No se especificaron tickets válidos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Verificar disponibilidad
    const ticketsNoDisponibles = [];
    for (const ticketNum of ticketsArray) {
      const ticket = await db.prepare(
        'SELECT numero, estado, usuario_id FROM tickets WHERE numero = ?'
      ).bind(ticketNum).first();
      
      if (!ticket) {
        console.log(`❌ Ticket ${ticketNum} no existe`);
        ticketsNoDisponibles.push(`${ticketNum} (no existe)`);
      } else if (ticket.estado !== 'disponible' || ticket.usuario_id) {
        console.log(`❌ Ticket ${ticketNum} no disponible (estado: ${ticket.estado}, usuario_id: ${ticket.usuario_id})`);
        ticketsNoDisponibles.push(`${ticketNum} (no disponible)`);
      }
    }
    
    if (ticketsNoDisponibles.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Tickets no disponibles: ${ticketsNoDisponibles.join(', ')}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Obtener tasa para cálculo en Bs
    const tasa = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('bs_creditos').first();
    
    const tasaBs = tasa ? tasa.valor : 250;
    const montoBs = (totalCreditos * tasaBs) / 100;
    console.log(`💰 Conversión: ${totalCreditos} créditos = ${montoBs} Bs (tasa: ${tasaBs} Bs/100cr)`);

    // 6. TRANSACCIÓN
    console.log('🔄 Iniciando transacción...');
    
    try {
      // A. Descontar créditos
      const nuevoSaldo = usuario.creditos - totalCreditos;
      console.log(`💳 Descontando créditos: ${usuario.creditos} - ${totalCreditos} = ${nuevoSaldo}`);
      
      await db.prepare(
        'UPDATE usuarios SET creditos = ? WHERE id = ?'
      ).bind(nuevoSaldo, userId).run();
      
      console.log('✅ Créditos descontados');
      
      // B. Crear orden
      console.log('📝 Creando orden...');
      const ordenResult = await db.prepare(
        `INSERT INTO ordenes (
          usuario_id, nombre, telefono, email, tickets, 
          cantidad_tickets, total_creditos, total_bs, metodo_pago, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'creditos', 'verificado')`
      ).bind(
        userId,
        nombre,
        telefono,
        email || '',
        tickets,
        ticketsArray.length,
        totalCreditos,
        montoBs
      ).run();
      
      const ordenId = ordenResult.meta.last_row_id;
      console.log(`✅ Orden creada ID: ${ordenId}`);
      
      // C. Calcular créditos por ticket
      const creditosPorTicket = Math.floor(totalCreditos / ticketsArray.length);
      
      // D. Actualizar tickets
      console.log('🎫 Actualizando tickets...');
      let ticketsActualizados = 0;
      
      for (const ticketNum of ticketsArray) {
        await db.prepare(
          `UPDATE tickets SET 
            orden_id = ?, 
            usuario_id = ?, 
            nombre = ?, 
            telefono = ?, 
            estado = 'vendido',
            creditos = ?,
            fecha_compra = CURRENT_TIMESTAMP
           WHERE numero = ?`
        ).bind(
          ordenId,
          userId,
          nombre,
          telefono,
          creditosPorTicket,
          ticketNum
        ).run();
        
        ticketsActualizados++;
        console.log(`✅ Ticket ${ticketNum} actualizado`);
      }
      
      console.log(`✅ Tickets actualizados: ${ticketsActualizados}/${ticketsArray.length}`);
      
      // 7. ÉXITO
      console.log('🎉 ¡Compra exitosa!');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Compra realizada exitosamente',
        data: {
          ordenId: ordenId,
          tickets: ticketsArray,
          cantidadTickets: ticketsArray.length,
          totalCreditos: totalCreditos,
          creditosRestantes: nuevoSaldo,
          creditosPorTicket: creditosPorTicket,
          montoEquivalenteBs: montoBs
        },
        redirect: `/compra-exitosa.html?orden=${ordenId}&tickets=${tickets}`
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } catch (transaccionError) {
      console.error('❌ Error en transacción:', transaccionError);
      
      // Rollback: devolver créditos
      try {
        await db.prepare(
          'UPDATE usuarios SET creditos = ? WHERE id = ?'
        ).bind(usuario.creditos, userId).run();
        console.log('🔄 Rollback de créditos realizado');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError);
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error en el proceso de compra: ' + transaccionError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}