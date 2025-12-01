export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { recargaId, accion, adminId } = await request.json();
    
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
    const recarga = await db.prepare(`
      SELECT r.*, r.creditos_solicitados as creditos
      FROM recargas r 
      WHERE r.id = ?
    `).get(recargaId);

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
      // Aprobar recarga - sumar créditos al usuario
      await db.prepare(`
        UPDATE usuarios 
        SET creditos = creditos + ? 
        WHERE id = ?
      `).run(recarga.creditos, recarga.usuario_id);
    }

    // Actualizar estado de la recarga
    await db.prepare(`
      UPDATE recargas 
      SET estado = ?, fecha_procesado = CURRENT_TIMESTAMP, administrador_id = ?
      WHERE id = ?
    `).run(accion, adminId || null, recargaId);

    return new Response(JSON.stringify({
      success: true,
      message: `Recarga ${accion === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`,
      data: {
        creditosAprobados: accion === 'aprobada' ? recarga.creditos : 0
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error procesando recarga:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}