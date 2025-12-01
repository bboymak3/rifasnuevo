// functions/api/comprar-tickets.js - VERSIÓN SIMPLIFICADA
export async function onRequest(context) {
  const { request, env } = context;
  
  // Configurar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método no permitido' 
      }),
      {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }

  try {
    // Obtener datos
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'JSON inválido' 
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }
    
    const { userId, nombre, telefono, tickets, totalCreditos } = data;
    
    console.log('📤 Datos recibidos:', { userId, nombre, tickets, totalCreditos });
    
    // Validaciones básicas
    if (!userId || !nombre || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Datos incompletos o inválidos' 
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    const db = env.DB;
    
    // 1. Verificar usuario
    const usuario = await db.prepare(
      'SELECT id, nombre, creditos FROM usuarios WHERE id = ?'
    ).bind(userId).first();

    if (!usuario) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Usuario no encontrado' 
        }),
        {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    // 2. Verificar créditos
    const creditosNecesarios = totalCreditos || (tickets.length * 100);
    if (usuario.creditos < creditosNecesarios) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Créditos insuficientes. Disponibles: ${usuario.creditos}, Necesarios: ${creditosNecesarios}` 
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    // 3. Verificar tickets disponibles
    const placeholders = tickets.map(() => '?').join(',');
    const ticketsOcupados = await db
      .prepare(`SELECT numero FROM tickets WHERE numero IN (${placeholders}) AND vendido = 1`)
      .bind(...tickets)
      .all();

    if (ticketsOcupados.results.length > 0) {
      const ocupados = ticketsOcupados.results.map(t => t.numero);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Tickets ya vendidos: ${ocupados.join(', ')}`
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    // 4. Procesar compra
    const fecha = new Date().toISOString();
    
    // Descontar créditos
    await db
      .prepare('UPDATE usuarios SET creditos = creditos - ? WHERE id = ?')
      .bind(creditosNecesarios, userId)
      .run();

    // Registrar compra
    await db
      .prepare(`
        INSERT INTO compras (userId, nombre, telefono, tickets, total_creditos, fecha)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(userId, nombre, telefono || '', JSON.stringify(tickets), creditosNecesarios, fecha)
      .run();

    // Marcar tickets como vendidos
    for (const ticketNum of tickets) {
      await db
        .prepare('UPDATE tickets SET vendido = 1, userId = ?, fecha_compra = ? WHERE numero = ?')
        .bind(userId, fecha, ticketNum)
        .run();
    }

    // Obtener créditos actualizados
    const usuarioActualizado = await db
      .prepare('SELECT creditos FROM usuarios WHERE id = ?')
      .bind(userId)
      .first();

    console.log('✅ Compra exitosa procesada');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compra realizada exitosamente',
        creditosRestantes: usuarioActualizado.creditos,
        ticketsComprados: tickets,
        totalPagado: creditosNecesarios
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );

  } catch (error) {
    console.error('💥 ERROR en compra-tickets:', error);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
}