export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    console.log('=== PROCESAR RECARGA ===');
    
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('Body recibido:', body);
    
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
    
    // Obtener información de la recarga
    console.log('Buscando recarga ID:', recargaId);
    const recarga = await db.prepare(
      'SELECT * FROM recargas WHERE id = ?'
    ).bind(recargaId).first();

    if (!recarga) {
      console.log('Recarga no encontrada');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Recarga no encontrada' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Recarga encontrada:', recarga);

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
      // Calcular créditos a aprobar (basado en tasa actual)
      const tasa = await db.prepare(
        'SELECT valor FROM config_tasas WHERE tipo = ?'
      ).bind('bs_creditos').first();

      const tasaBsCreditos = tasa ? tasa.valor : 250;
      const creditosAprobados = Math.floor((recarga.monto * 100) / tasaBsCreditos);
      
      console.log('Aprobando créditos:', { monto: recarga.monto, tasa: tasaBsCreditos, creditos: creditosAprobados });

      // Sumar créditos al usuario
      await db.prepare(
        'UPDATE usuarios SET creditos = creditos + ? WHERE id = ?'
      ).bind(creditosAprobados, recarga.usuario_id).run();
      
      console.log('Créditos sumados al usuario:', recarga.usuario_id);
    }

    // Actualizar estado de la recarga
    await db.prepare(
      'UPDATE recargas SET estado = ?, fecha_procesado = CURRENT_TIMESTAMP, administrador_id = ? WHERE id = ?'
    ).bind(accion, adminId || null, recargaId).run();

    console.log('Recarga actualizada a estado:', accion);

    return new Response(JSON.stringify({
      success: true,
      message: `Recarga ${accion === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`,
      data: {
        recargaId: recargaId,
        nuevoEstado: accion,
        creditosAprobados: accion === 'aprobada' ? Math.floor((recarga.monto * 100) / (tasa?.valor || 250)) : 0
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