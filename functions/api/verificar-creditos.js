export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: userId es requerido' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Verificar créditos del usuario
    const usuario = await db.prepare(
      'SELECT creditos FROM usuarios WHERE id = ?'
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

    // Obtener precio de ticket en créditos
    const tasa = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('rifa_ticket').first();

    const precioCredito = tasa ? tasa.valor : 100; // 100 créditos por ticket por defecto

    return new Response(JSON.stringify({
      success: true,
      data: {
        creditosDisponibles: usuario.creditos,
        precioPorTicket: precioCredito
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error verificando créditos:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}