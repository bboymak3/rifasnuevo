++ new file: e:\Documents\rifasnuevo\functions\api\seed-tickets.js
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const db = env.DB;

    // Verificar cuántos tickets existen
    const countRes = await db.prepare('SELECT COUNT(*) as cnt FROM tickets').first();
    const cnt = countRes?.cnt || 0;

    if (cnt >= 100) {
      return new Response(JSON.stringify({ success: true, message: 'Tabla de tickets ya poblada', total: cnt }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Insertar números faltantes (1..100)
    const now = new Date().toISOString();
    for (let i = 1; i <= 100; i++) {
      // Insertar solo si no existe
      await db.prepare('INSERT OR IGNORE INTO tickets (numero, vendido, userId, fecha_creacion) VALUES (?, 0, NULL, ?)').bind(i, now).run();
    }

    const newCountRes = await db.prepare('SELECT COUNT(*) as cnt FROM tickets').first();
    return new Response(JSON.stringify({ success: true, message: 'Tickets sembrados', previous: cnt, total: newCountRes.cnt }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error sembrando tickets:', error);
    return new Response(JSON.stringify({ success: false, error: 'Error interno: ' + error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
