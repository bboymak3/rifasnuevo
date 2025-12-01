export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('=== CONFIG TASAS ===');
  
  try {
    // Solo permitir GET y POST
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    if (request.method === 'GET') {
      // Obtener todas las tasas
      console.log('📊 Obteniendo configuración de tasas...');
      const tasas = await db.prepare(
        'SELECT * FROM config_tasas ORDER BY tipo'
      ).all();

      console.log(`✅ ${tasas.results?.length || 0} tasas encontradas`);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          tasas: tasas.results || []
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    if (request.method === 'POST') {
      // Actualizar una tasa
      const body = await request.json();
      console.log('📝 Actualizando tasa:', body);
      
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
      
      console.log(`✅ Tasa actualizada: ${tipo} → ${nuevoValor}`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Tasa actualizada correctamente',
        data: {
          tipo: tipo,
          nuevoValor: nuevoValor,
          fecha_actualizacion: new Date().toISOString()
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    console.error('Error en config-tasas:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}