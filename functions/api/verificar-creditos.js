export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('=== VERIFICAR CRÉDITOS ===');
  
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
    
    // 1. Verificar usuario
    const usuario = await db.prepare(
      'SELECT id, nombre, telefono, email, creditos FROM usuarios WHERE id = ?'
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

    // 2. Obtener precio de ticket
    const tasa = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('rifa_ticket').first();

    const precioPorTicket = tasa ? tasa.valor : 100;
    
    // 3. Obtener tasa de conversión Bs/Créditos
    const tasaBs = await db.prepare(
      'SELECT valor FROM config_tasas WHERE tipo = ?'
    ).bind('bs_creditos').first();
    
    const valorBsPor100Creditos = tasaBs ? tasaBs.valor : 250;

    return new Response(JSON.stringify({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          telefono: usuario.telefono,
          email: usuario.email,
          creditos: usuario.creditos
        },
        precios: {
          precioPorTicket: precioPorTicket,
          valorBsPor100Creditos: valorBsPor100Creditos,
          ticketEnBs: (precioPorTicket * valorBsPor100Creditos) / 100
        },
        mensaje: `Tienes ${usuario.creditos} créditos disponibles. Cada ticket cuesta ${precioPorTicket} créditos.`
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