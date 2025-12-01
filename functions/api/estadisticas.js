export async function onRequest(context) {
  const { env } = context;
  
  try {
    const db = env.DB;
    
    // 1. Contar tickets vendidos
    const ticketsVendidos = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM tickets 
      WHERE estado = 'vendido' 
      OR nombre IS NOT NULL
      OR usuario_id IS NOT NULL
    `).first();

    // 2. Contar tickets disponibles
    const ticketsDisponibles = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM tickets 
      WHERE (estado = 'disponible' OR estado IS NULL)
      AND (usuario_id IS NULL OR usuario_id = 0)
      AND (nombre IS NULL OR nombre = '')
    `).first();

    // 3. Calcular total recaudado en Bs
    const totalRecaudado = await db.prepare(`
      SELECT COALESCE(SUM(total_bs), 0) as total 
      FROM ordenes 
      WHERE estado = 'verificado'
    `).first();

    // 4. Contar total de órdenes
    const totalOrdenes = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM ordenes
    `).first();

    return new Response(JSON.stringify({
      success: true,
      data: {
        vendidos: ticketsVendidos?.total || 0,
        disponibles: ticketsDisponibles?.total || 100, // Por defecto 100
        recaudado: totalRecaudado?.total || 0,
        totalOrdenes: totalOrdenes?.total || 0
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}