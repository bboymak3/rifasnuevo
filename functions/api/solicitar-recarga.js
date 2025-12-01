export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { monto, metodoPago, referenciaPago, userId } = await request.json();
    
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
    const usuario = await db.prepare(`
      SELECT id FROM usuarios WHERE id = ?
    `).get(userId);

    if (!usuario) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuario no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener tasa actual para calcular créditos
    const tasa = await db.prepare(`
      SELECT valor FROM config_tasas WHERE tipo = 'bs_creditos'
    `).get();

    const tasaBsCreditos = tasa ? tasa.valor : 250; // Valor por defecto
    
    // Calcular créditos a recibir
    const creditosRecibir = Math.floor((monto * 100) / tasaBsCreditos);

    // Insertar solicitud de recarga
    const result = await db.prepare(`
      INSERT INTO recargas (usuario_id, monto, metodo_pago, referencia_pago, estado, creditos_solicitados)
      VALUES (?, ?, ?, ?, 'pendiente', ?)
    `).run(userId, monto, metodoPago, referenciaPago, creditosRecibir);

    return new Response(JSON.stringify({
      success: true,
      data: { 
        id: result.lastInsertRowid,
        creditosSolicitados: creditosRecibir
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error solicitando recarga:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}