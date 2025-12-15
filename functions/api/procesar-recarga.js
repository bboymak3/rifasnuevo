export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('=== PROCESAR RECARGA ===');
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('📦 Datos recibidos:', body);
    
    const { recargaId, accion, adminId } = body;
    
    if (!recargaId || !accion) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: recargaId y accion' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // 1. Obtener recarga
    console.log(`🔍 Buscando recarga ID: ${recargaId}`);
    const recarga = await db.prepare(
      `SELECT r.*, u.nombre as usuario_nombre, u.email as usuario_email 
       FROM recargas r 
       LEFT JOIN usuarios u ON r.usuario_id = u.id 
       WHERE r.id = ?`
    ).bind(recargaId).first();

    if (!recarga) {
      console.log('❌ Recarga no encontrada');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Recarga no encontrada' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Recarga encontrada: ${recarga.usuario_nombre}, Monto: ${recarga.monto}, Estado: ${recarga.estado}`);

    if (recarga.estado !== 'pendiente') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Esta recarga ya fue procesada' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (accion === 'aprobada') {
      // 2. Calcular créditos a aprobar
      const tasa = await db.prepare(
        'SELECT valor FROM config_tasas WHERE tipo = ?'
      ).bind('bs_creditos').first();

      const tasaBsCreditos = tasa ? tasa.valor : 250;
      const creditosAprobados = Math.floor((recarga.monto * 100) / tasaBsCreditos);
      
      console.log(`💰 Aprobando créditos: ${recarga.monto} Bs → ${creditosAprobados} créditos (tasa: ${tasaBsCreditos} Bs/100cr)`);

      // 3. Sumar créditos al usuario
        try {
          const updateRes = await db.prepare(
            'UPDATE usuarios SET creditos = creditos + ? WHERE id = ?'
          ).bind(creditosAprobados, recarga.usuario_id).run();

          // Algunas drivers devuelven meta, otras no; intentaremos verificar que se actualizó
          console.log('Resultado UPDATE usuarios:', updateRes);

          // Obtener nuevo saldo del usuario
          const usuarioActualizado = await db.prepare('SELECT id, creditos FROM usuarios WHERE id = ?').bind(recarga.usuario_id).first();
          if (!usuarioActualizado) {
            throw new Error('No se pudo obtener el usuario después de actualizar los créditos');
          }

          console.log(`✅ Créditos sumados al usuario ${recarga.usuario_id}. Nuevo saldo: ${usuarioActualizado.creditos}`);
          // Reemplazar creditosAprobados por el valor real en la respuesta si hace falta
          recarga.creditosAprobados = creditosAprobados;
          recarga.usuario_creditos_nuevo = usuarioActualizado.creditos;
        } catch (err) {
          console.error('Error actualizando créditos del usuario:', err);
          return new Response(JSON.stringify({ success: false, error: 'Error actualizando créditos del usuario: ' + err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }

    // 4. Actualizar estado de la recarga
    await db.prepare(
      'UPDATE recargas SET estado = ?, fecha_procesado = CURRENT_TIMESTAMP, administrador_id = ? WHERE id = ?'
    ).bind(accion, adminId || null, recargaId).run();

    console.log(`✅ Recarga actualizada a estado: ${accion}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Recarga ${accion === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`,
      data: {
        recargaId: recargaId,
        nuevoEstado: accion,
        creditosAprobados: accion === 'aprobada' ? recarga.creditosAprobados || Math.floor((recarga.monto * 100) / (tasa?.valor || 250)) : 0,
        nuevosCreditosUsuario: recarga.usuario_creditos_nuevo || null
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error procesando recarga:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}