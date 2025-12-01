export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { monto, metodoPago, referenciaPago, userId } = data;
    
    console.log('Solicitar recarga:', { monto, metodoPago, referenciaPago, userId });
    
    if (!monto || !metodoPago || !referenciaPago || !userId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: monto, metodoPago, referenciaPago, userId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Verificar que el usuario existe
    const usuario = await db.prepare(
      'SELECT id FROM usuarios WHERE id = ?'
    ).bind(userId).first();

    if (!usuario) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuario no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener tasa actual
    const tasa = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('bs_creditos').first();

    const tasaBsCreditos = tasa ? tasa.valor : 250;
    
    // Calcular créditos
    const creditosRecibir = Math.floor((monto * 100) / tasaBsCreditos);
    
    console.log('Calculando créditos:', { monto, tasaBsCreditos, creditosRecibir });

    // Insertar solicitud
    const result = await db.prepare(
      'INSERT INTO recargas (usuario_id, monto, metodo_pago, referencia_pago, estado) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, monto, metodoPago, referenciaPago, 'pendiente').run();

    console.log('Recarga insertada, ID:', result.meta?.last_row_id);
    
    return new Response(JSON.stringify({
      success: true,
      data: { 
        id: result.meta?.last_row_id,
        creditosSolicitados: creditosRecibir,
        tasaAplicada: tasaBsCreditos
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error en solicitar-recarga:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}