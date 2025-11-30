export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { ordenId, nuevoEstado } = body;

    const db = env.DB;

    // Validar que el estado sea uno de los permitidos
    const estadosPermitidos = ['pendiente', 'verificado', 'rechazado'];
    if (!estadosPermitidos.includes(nuevoEstado)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Estado no válido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Actualizar el estado en la base de datos
    const result = await db.prepare(
      'UPDATE ordenes SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(nuevoEstado, ordenId).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Orden no encontrada'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Estado actualizado correctamente'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error en cambiar-estado:', error);
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