export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('=== INICIANDO PROCESO DE COMPRA ===');
  
  try {
    if (request.method !== 'POST') {
      console.log('❌ Método no permitido:', request.method);
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('📦 Body recibido:', JSON.stringify(body));
    
    const { userId, nombre, telefono, email, tickets, totalCreditos } = body;
    
    // Validación de parámetros
    const errores = [];
    if (!userId) errores.push('userId');
    if (!nombre) errores.push('nombre');
    if (!telefono) errores.push('telefono');
    if (!tickets) errores.push('tickets');
    if (!totalCreditos) errores.push('totalCreditos');
    
    if (errores.length > 0) {
      console.log('❌ Faltan parámetros:', errores);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Faltan parámetros requeridos: ${errores.join(', ')}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    console.log(`👤 Buscando usuario ID: ${userId}`);
    
    // Verificar créditos del usuario
    const usuario = await db.prepare(
      'SELECT id, creditos, nombre as nombre_usuario FROM usuarios WHERE id = ?'
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

    console.log(`✅ Usuario encontrado: ${usuario.nombre_usuario}, Créditos: ${usuario.creditos}`);
    
    if (usuario.creditos < totalCreditos) {
      console.log(`❌ Créditos insuficientes: ${usuario.creditos} < ${totalCreditos}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Créditos insuficientes. Necesitas ${totalCreditos} créditos, pero solo tienes ${usuario.creditos}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar que los tickets estén disponibles
    const ticketsArray = tickets.split(',').map(t => t.trim());
    console.log(`🎫 Tickets a comprar: ${ticketsArray.length} - ${ticketsArray.join(', ')}`);
    
    // Verificar disponibilidad de cada ticket
    const ticketsNoDisponibles = [];
    
    for (const ticketNum of ticketsArray) {
      const ticketExistente = await db.prepare(
        'SELECT id, numero, orden_id FROM tickets WHERE numero = ?'
      ).bind(ticketNum).first();
      
      if (ticketExistente) {
        console.log(`❌ Ticket ${ticketNum} ya existe`);
        ticketsNoDisponibles.push(ticketNum);
      }
    }
    
    if (ticketsNoDisponibles.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Los siguientes tickets no están disponibles: ${ticketsNoDisponibles.join(', ')}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener tasa de conversión para registro
    console.log('💰 Obteniendo tasa de ticket...');
    const tasa = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('rifa_ticket').first();

    const precioPorTicket = tasa ? tasa.valor : 100;
    console.log(`💰 Precio por ticket: ${precioPorTicket} créditos`);
    
    // Calcular monto en Bs (para registro histórico)
    const tasaBsCreditos = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('bs_creditos').first();
    
    const valorBsPor100Creditos = tasaBsCreditos ? tasaBsCreditos.valor : 250;
    const montoBs = (totalCreditos * valorBsPor100Creditos) / 100;
    console.log(`💰 Monto equivalente en Bs: ${montoBs} (${valorBsPor100Creditos} Bs = 100 créditos)`);

    // INICIAR TRANSACCIÓN MANUAL
    console.log('🔄 Iniciando transacción...');
    
    try {
      // 1. Descontar créditos del usuario
      const nuevoSaldo = usuario.creditos - totalCreditos;
      console.log(`💳 Descontando créditos: ${usuario.creditos} - ${totalCreditos} = ${nuevoSaldo}`);
      
      const updateUsuario = await db.prepare(
        'UPDATE usuarios SET creditos = ? WHERE id = ?'
      ).bind(nuevoSaldo, userId).run();
      
      if (!updateUsuario.success) {
        throw new Error('Error al actualizar créditos del usuario');
      }
      console.log('✅ Créditos descontados');
      
      // 2. Crear orden de compra
      console.log('📝 Creando orden de compra...');
      const ordenResult = await db.prepare(
        `INSERT INTO ordenes (usuario_id, nombre, telefono, email, tickets, total_creditos, total_bs, metodo_pago, estado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'creditos', 'verificado')`
      ).bind(
        userId, 
        nombre, 
        telefono, 
        email || '', 
        tickets, 
        totalCreditos, 
        montoBs
      ).run();
      
      if (!ordenResult.success) {
        throw new Error('Error al crear la orden');
      }
      
      const ordenId = ordenResult.meta.last_row_id;
      console.log(`✅ Orden creada ID: ${ordenId}`);
      
      // 3. Asignar tickets al usuario
      console.log('🎫 Asignando tickets...');
      let ticketsAsignados = 0;
      
      for (const ticketNum of ticketsArray) {
        const insertTicket = await db.prepare(
          `INSERT INTO tickets (numero, orden_id, usuario_id, nombre, telefono, estado, fecha_compra) 
           VALUES (?, ?, ?, ?, ?, 'vendido', CURRENT_TIMESTAMP)`
        ).bind(ticketNum, ordenId, userId, nombre, telefono).run();
        
        if (insertTicket.success) {
          ticketsAsignados++;
        } else {
          console.error(`❌ Error insertando ticket ${ticketNum}`);
        }
      }
      
      console.log(`✅ Tickets asignados: ${ticketsAsignados} de ${ticketsArray.length}`);
      
      if (ticketsAsignados !== ticketsArray.length) {
        // Rollback parcial - marcar orden como error
        await db.prepare(
          'UPDATE ordenes SET estado = ? WHERE id = ?'
        ).bind('error', ordenId).run();
        
        throw new Error(`Error asignando tickets. Solo se asignaron ${ticketsAsignados} de ${ticketsArray.length}`);
      }
      
      console.log('🎉 Compra procesada exitosamente!');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Compra procesada exitosamente',
        data: {
          ordenId: ordenId,
          ticketsAsignados: ticketsArray,
          creditosRestantes: nuevoSaldo,
          totalCreditos: totalCreditos,
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
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error en el proceso de compra: ' + transaccionError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Error general en compra:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}