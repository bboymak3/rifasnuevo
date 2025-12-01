export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('=== SOLICITAR RECARGA ===');
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('📦 Datos recibidos:', body);
    
    const { monto, metodoPago, referenciaPago, userId } = body;
    
    if (!monto || !metodoPago || !userId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: monto, metodoPago y userId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // 1. Verificar usuario
    const usuario = await db.prepare(
      'SELECT id, nombre FROM usuarios WHERE id = ?'
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

    // 2. Calcular créditos solicitados
    const tasa = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('bs_creditos').first();

    const tasaBsCreditos = tasa ? tasa.valor : 250;
    const creditosSolicitados = Math.floor((monto * 100) / tasaBsCreditos);
    
    console.log(`💰 Solicitud: ${monto} Bs → ${creditosSolicitados} créditos`);

    // 3. Crear solicitud de recarga
    const resultado = await db.prepare(
      `INSERT INTO recargas (
        usuario_id, monto, creditos_solicitados, 
        metodo_pago, referencia_pago, estado
      ) VALUES (?, ?, ?, ?, ?, 'pendiente')`
    ).bind(
      userId,
      monto,
      creditosSolicitados,
      metodoPago,
      referenciaPago || '',
      'pendiente'
    ).run();

    const recargaId = resultado.meta.last_row_id;
    console.log(`✅ Solicitud creada ID: ${recargaId}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Solicitud de recarga registrada correctamente',
      data: {
        id: recargaId,
        usuario: usuario.nombre,
        monto: monto,
        creditosSolicitados: creditosSolicitados,
        metodoPago: metodoPago,
        estado: 'pendiente',
        fechaSolicitud: new Date().toISOString()
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error solicitando recarga:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}