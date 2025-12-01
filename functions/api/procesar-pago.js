﻿﻿export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { 
      rifaId, 
      tickets, 
      nombre, 
      telefono, 
      email, 
      metodoPago, 
      comprobante, 
      total,
      password,
      usuarioId,
      pagoConCreditos,
      creditosUtilizados
    } = body;

    // AGREGAR ESTOS CONSOLE.LOG PARA DEBUG
    console.log('🔍 DEBUG - Datos recibidos:', JSON.stringify(body, null, 2));
    console.log('🔍 DEBUG - Tickets recibidos:', tickets);
    console.log('🔍 DEBUG - Tipo de tickets:', typeof tickets, Array.isArray(tickets));
    console.log('🔍 DEBUG - Cantidad de tickets:', tickets?.length);
    console.log('🔍 DEBUG - Pago con créditos:', pagoConCreditos);
    console.log('🔍 DEBUG - Créditos a utilizar:', creditosUtilizados);
    console.log('🔍 DEBUG - Usuario ID:', usuarioId);

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

    // VALIDACIÓN ESPECÍFICA PARA PAGO CON CRÉDITOS
    if (pagoConCreditos && usuarioId) {
      console.log('🔍 DEBUG - Validando pago con créditos...');
      
      // 1. Verificar que el usuario exista y tenga suficiente saldo
      const usuario = await db.prepare(`
        SELECT creditos FROM usuarios WHERE id = ?
      `).bind(usuarioId).first();

      if (!usuario) {
        console.log('❌ ERROR: Usuario no encontrado');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Usuario no encontrado' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (usuario.creditos < creditosUtilizados) {
        console.log('❌ ERROR: Saldo insuficiente. Saldo actual:', usuario.creditos, 'Créditos requeridos:', creditosUtilizados);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Saldo insuficiente para completar la compra' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log('✅ DEBUG - Saldo suficiente. Restando créditos...');
    }

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

    // 2. Si es pago con créditos, restar créditos primero
    if (pagoConCreditos && usuarioId) {
      console.log('🔍 DEBUG - Restando créditos del usuario...');
      
      await db.prepare(`
        UPDATE usuarios 
        SET creditos = creditos - ? 
        WHERE id = ?
      `).bind(creditosUtilizados, usuarioId).run();
      
      console.log('✅ DEBUG - Créditos restados exitosamente');
    }

    // 3. Crear la orden
    console.log('🔍 DEBUG - Creando orden...');
    
    // Determinar el estado inicial basado en el método de pago
    let estadoInicial = 'pendiente';
    if (pagoConCreditos) {
      estadoInicial = 'verificado'; // Los pagos con créditos se verifican automáticamente
    }
    
    console.log('🔍 DEBUG - Estado inicial de la orden:', estadoInicial);

    const orden = await db.prepare(
      `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado, total, metodo_pago, comprobante, pago_con_creditos, creditos_utilizados, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      tickets.join(','),  // Esto guarda los tickets como string
      nombre,
      telefono,
      email || '',
      parseInt(rifaId),
      estadoInicial,
      parseFloat(total),
      metodoPago,
      comprobante || '', // Para pagos con créditos puede estar vacío
      pagoConCreditos ? 1 : 0,
      creditosUtilizados || 0,
      usuarioId || null
    ).run();

    const ordenId = orden.meta.last_row_id;
    console.log('✅ DEBUG - Orden creada con ID:', ordenId);

    // 4. Actualizar tickets
    console.log('🔍 DEBUG - Actualizando tickets...');
    const updateResult = await db.prepare(
      `UPDATE tickets SET vendido = 1, orden_id = ? WHERE numero IN (${placeholders})`
    ).bind(ordenId.toString(), ...tickets).run();

    console.log('✅ DEBUG - Tickets actualizados. Filas afectadas:', updateResult.meta.changes);

    // 5. Si es pago con créditos, crear registro de transacción
    if (pagoConCreditos && usuarioId) {
      console.log('🔍 DEBUG - Creando registro de transacción de créditos...');
      
      await db.prepare(`
        INSERT INTO transacciones_creditos (
          usuario_id, 
          tipo, 
          monto_creditos, 
          descripcion, 
          orden_id
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        usuarioId,
        'compra_rifa',
        creditosUtilizados * -1, // Negativo porque es un gasto
        `Compra de ${tickets.length} ticket(s) para la rifa #${rifaId}`,
        ordenId
      ).run();
      
      console.log('✅ DEBUG - Transacción de créditos registrada');
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: ordenId,
      message: `✅ Compra procesada exitosamente${pagoConCreditos ? ' con créditos' : ''}`,
      pagoConCreditos: pagoConCreditos,
      creditosUtilizados: creditosUtilizados || 0
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ ERROR en procesar-pago:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Revertir créditos si hubo un error después de restarlos
    if (body.pagoConCreditos && body.usuarioId && body.creditosUtilizados) {
      console.log('🔄 DEBUG - Intentando revertir créditos por error...');
      try {
        const db = env.DB;
        await db.prepare(`
          UPDATE usuarios 
          SET creditos = creditos + ? 
          WHERE id = ?
        `).bind(body.creditosUtilizados, body.usuarioId).run();
        console.log('✅ DEBUG - Créditos revertidos exitosamente');
      } catch (revertError) {
        console.error('❌ ERROR al revertir créditos:', revertError);
      }
    }
    
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