// functions/api/admin/backup.js
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const ADMIN_TOKEN = env.ADMIN_TOKEN || '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const db = env.DB;
    const usuarios = await db.prepare('SELECT * FROM usuarios').all().catch(e => ({ error: e.message }));
    const recargas = await db.prepare('SELECT * FROM recargas').all().catch(e => ({ error: e.message }));
    const tickets = await db.prepare('SELECT * FROM tickets').all().catch(e => ({ error: e.message }));
    const ventas = await db.prepare('SELECT * FROM ventas').all().catch(e => ({ error: e.message }));

    return new Response(JSON.stringify({ success: true, data: { usuarios, recargas, tickets, ventas } }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error backup admin:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
