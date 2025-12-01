// comprar-tickets.js
export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { userId, nombre, telefono, tickets, totalCreditos } = await request.json();
    
    // Validar datos requeridos
    if (!userId || !nombre || !telefono || !tickets || totalCreditos === undefined) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan datos: userId, nombre, telefono, tickets, totalCreditos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Verificar usuario y créditos
    const usuario = await db.prepare(`
      SELECT id, creditos FROM usuarios WHERE id = ?
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

    // Verificar créditos suficientes
    if (usuario.creditos < totalCreditos) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Créditos insuficientes' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Iniciar transacción
    await db.batch([
      // Descontar créditos
      db.prepare(`
        UPDATE usuarios 
        SET creditos = creditos - ? 
        WHERE id = ?
      `).bind(totalCreditos, userId),
      
      // Registrar compra
      db.prepare(`
        INSERT INTO compras (userId, nombre, telefono, tickets, totalCreditos, fecha)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(userId, nombre, telefono, JSON.stringify(tickets), totalCreditos, new Date().toISOString()),
      
      // Marcar tickets como vendidos
      ...tickets.map(ticketNum => 
        db.prepare(`
          UPDATE tickets 
          SET vendido = 1, userId = ?, fechaCompra = ?
          WHERE numero = ? AND vendido = 0
        `).bind(userId, new Date().toISOString(), ticketNum)
      )
    ]);

    // Obtener créditos actualizados
    const usuarioActualizado = await db.prepare(`
      SELECT creditos FROM usuarios WHERE id = ?
    `).get(userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Compra realizada con éxito',
      creditosRestantes: usuarioActualizado.creditos
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en compra:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}