// /functions/api/admin.js
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Verificar contraseña de admin
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = atob(base64Credentials);
  const [username, password] = credentials.split(':');
  
  if (password !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Obtener lista de usuarios
  if (path === '/api/admin/usuarios' && request.method === 'GET') {
    try {
      const usuarios = await DB.prepare(
        'SELECT id, email, nombre, puntos FROM usuarios ORDER BY id'
      ).all();
      
      return new Response(JSON.stringify({
        success: true,
        usuarios: usuarios.results
      }), { headers: { 'Content-Type': 'application/json' } });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error al obtener usuarios',
        details: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Ajustar puntos de usuario
  if (path === '/api/admin/ajustar-puntos' && request.method === 'POST') {
    try {
      const data = await request.json();
      const { usuarioId, puntos, descripcion } = data;
      
      if (!usuarioId || puntos === undefined || !descripcion) {
        return new Response(JSON.stringify({
          error: 'Faltan datos: usuarioId, puntos y descripcion son requeridos'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      
      await DB.prepare(
        'UPDATE usuarios SET puntos = puntos + ? WHERE id = ?'
      ).bind(puntos, usuarioId).run();
      
      await DB.prepare(`
        INSERT INTO transacciones (usuario_id, tipo, puntos, descripcion)
        VALUES (?, 'admin', ?, ?)
      `).bind(usuarioId, puntos, `Admin: ${descripcion}`);
      
      const usuarioActualizado = await DB.prepare(
        'SELECT id, email, nombre, puntos FROM usuarios WHERE id = ?'
      ).bind(usuarioId).first();
      
      return new Response(JSON.stringify({
        success: true,
        message: `Puntos ajustados: ${puntos > 0 ? '+' : ''}${puntos}`,
        usuario: usuarioActualizado
      }), { headers: { 'Content-Type': 'application/json' } });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error al ajustar puntos',
        details: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Obtener números vendidos
  if (path === '/api/admin/numeros-vendidos' && request.method === 'GET') {
    try {
      const numerosVendidos = await DB.prepare(
        `SELECT n.id as numero, u.email, u.nombre, n.comprado_en
         FROM numeros_rifa n
         JOIN usuarios u ON n.usuario_id = u.id
         WHERE n.estado = 'vendido'
         ORDER BY n.id`
      ).all();
      
      const resumen = await DB.prepare(
        `SELECT 
           COUNT(*) as total_vendidos,
           COUNT(DISTINCT usuario_id) as compradores_unicos
         FROM numeros_rifa 
         WHERE estado = 'vendido'`
      ).first();
      
      return new Response(JSON.stringify({
        success: true,
        numeros: numerosVendidos.results,
        resumen: resumen
      }), { headers: { 'Content-Type': 'application/json' } });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error al obtener números vendidos',
        details: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), { 
    status: 404, headers: { 'Content-Type': 'application/json' }
  });
}
'@ | Out-File -FilePath functions\api\admin.js -Encoding UTF8