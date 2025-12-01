export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    console.log('=== ACTUALIZAR TASA ===');
    
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('Body recibido:', body);
    
    const { tipo, nuevoValor } = body;
    
    if (!tipo || !nuevoValor) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: tipo y nuevoValor' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = context.env.DB;
    
    // Verificar que la tasa existe
    const tasaExistente = await db.prepare(
      'SELECT * FROM config_tasas WHERE tipo = ?'
    ).bind(tipo).first();
    
    if (!tasaExistente) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Tipo de tasa no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Actualizar tasa
    await db.prepare(
      'UPDATE config_tasas SET valor = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE tipo = ?'
    ).bind(nuevoValor, tipo).run();
    
    console.log('✅ Tasa actualizada:', tipo, '->', nuevoValor);

    return new Response(JSON.stringify({
      success: true,
      message: 'Tasa actualizada correctamente',
      data: {
        tipo: tipo,
        nuevoValor: nuevoValor
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error actualizando tasa:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}