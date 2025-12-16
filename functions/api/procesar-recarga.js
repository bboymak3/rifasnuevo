export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('=== PROCESAR RECARGA ENDPOINT ===');
  
  try {
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
    
    // Obtener recarga
    const recarga = await db.prepare(
      'SELECT * FROM recargas WHERE id = ?'
    ).bind(recargaId).first();

    if (!recarga) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Recarga no encontrada' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
      // Obtener tasa
      const tasa = await db.prepare(
        'SELECT valor FROM config_tasas WHERE tipo = ?'
      ).bind('bs_creditos').first();

      const tasaBsCreditos = tasa ? tasa.valor : 250;
      const creditosAprobados = Math.floor((recarga.monto * 100) / tasaBsCreditos);
      
      // Sumar créditos al usuario
      await db.prepare(
        'UPDATE usuarios SET creditos = creditos + ? WHERE id = ?'
      ).bind(creditosAprobados, recarga.usuario_id).run();
    }

    // Actualizar estado
    await db.prepare(
      'UPDATE recargas SET estado = ?, fecha_procesado = CURRENT_TIMESTAMP, administrador_id = ? WHERE id = ?'
    ).bind(accion, adminId || null, recargaId).run();

    return new Response(JSON.stringify({
      success: true,
      message: `Recarga ${accion === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`
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