export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { confirmacion } = body;

    // Verificar confirmación por seguridad
    if (confirmacion !== 'CONFIRMAR_REINICIO') {
      return new Response(JSON.stringify({
        success: false,
        error: "Confirmación requerida"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;

    // Ejecutar en una transacción para mayor seguridad
    const result = await db.batch([
      // 1. Resetear todos los tickets a disponibles
      db.prepare('UPDATE tickets SET vendido = 0, orden_id = NULL'),
      
      // 2. Eliminar todas las órdenes
      db.prepare('DELETE FROM ordenes')
    ]);

    return new Response(JSON.stringify({
      success: true,
      message: '✅ Rifa reiniciada exitosamente. Todos los tickets están disponibles nuevamente.',
      datos: {
        ticketsActualizados: result[0].meta.changes,
        ordenesEliminadas: result[1].meta.changes
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error en reiniciar-rifa:', error);
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