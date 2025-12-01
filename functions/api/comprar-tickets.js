// functions/api/comprar-tickets.js - VERSIÓN ACTUALIZADA
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
    const data = await request.json();
    const { userId, nombre, telefono, tickets, totalCreditos } = data;
    
    console.log('🛒 Procesando compra para usuario:', userId);
    console.log('📋 Tickets a comprar:', tickets);
    console.log('💰 Total créditos:', totalCreditos);
    
    // Validar datos requeridos
    if (!userId || !nombre || !tickets || !Array.isArray(tickets) || tickets.length === 0 || totalCreditos === undefined) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Datos inválidos: userId, nombre, tickets (array), totalCreditos son requeridos' 
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
    
    // 1. Verificar usuario y créditos
    const usuario = await db.prepare(`
      SELECT id, nombre, email, creditos FROM usuarios WHERE id = ?
    `).bind(userId).first();

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

    // Verificar créditos suficientes
    if (usuario.creditos < totalCreditos) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Créditos insuficientes. Tienes ${usuario.creditos} créditos, necesitas ${totalCreditos}` 
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

    // 2. Verificar que los tickets estén disponibles
    const placeholders = tickets.map(() => '?').join(',');
    const ticketsCheck = await db
      .prepare(`SELECT numero FROM tickets WHERE numero IN (${placeholders}) AND vendido = 1`)
      .bind(...tickets)
      .all();

    if (ticketsCheck.results.length > 0) {
      const ocupados = ticketsCheck.results.map(t => t.numero);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Algunos tickets ya están vendidos: ${ocupados.join(', ')}`
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

    // 3. Procesar compra en una transacción
    const fecha = new Date().toISOString();
    
    try {
      // Actualizar créditos del usuario
      await db
        .prepare('UPDATE usuarios SET creditos = creditos - ? WHERE id = ?')
        .bind(totalCreditos, userId)
        .run();

      // Registrar compra
      const compraResult = await db
        .prepare(`
          INSERT INTO compras (userId, nombre, telefono, tickets, total_creditos, fecha)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(userId, nombre, telefono || '', JSON.stringify(tickets), totalCreditos, fecha)
        .run();

      // Marcar tickets como vendidos
      for (const ticketNum of tickets) {
        await db
          .prepare(`
            UPDATE tickets 
            SET vendido = 1, userId = ?, fecha_compra = ?
            WHERE numero = ?
          `)
          .bind(userId, fecha, ticketNum)
          .run();
      }

      // 4. Obtener créditos actualizados
      const usuarioActualizado = await db
        .prepare('SELECT creditos FROM usuarios WHERE id = ?')
        .bind(userId)
        .first();

      console.log('✅ Compra exitosa. Créditos restantes:', usuarioActualizado.creditos);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compra realizada con éxito',
          creditosRestantes: usuarioActualizado.creditos,
          ticketsComprados: tickets,
          compraId: compraResult.lastInsertId
        }),
        {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );

    } catch (dbError) {
      console.error('💥 Error en transacción de base de datos:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error al procesar la compra en la base de datos'
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

  } catch (error) {
    console.error('💥 ERROR general en compra:', error);
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