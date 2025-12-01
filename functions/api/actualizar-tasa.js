export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { tipo, nuevoValor } = await request.json();
    
    if (!tipo || nuevoValor === undefined) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: tipo y nuevoValor son requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Actualizar la tasa
    const result = await db.prepare(`
      UPDATE config_tasas 
      SET valor = ?, fecha_actualizacion = CURRENT_TIMESTAMP 
      WHERE tipo = ?
    `).run(nuevoValor, tipo);

    if (result.changes === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Tipo de configuración no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Tasa actualizada correctamente'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error actualizando tasa:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}