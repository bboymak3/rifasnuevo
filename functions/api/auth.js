// auth.js - Login y registro
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // LOGIN
  if (path === '/api/auth/login' && request.method === 'POST') {
    try {
      const data = await request.json();
      const { email, password } = data;
      
      if (!email || !password) {
        return new Response(JSON.stringify({
          error: 'Email y contraseña requeridos'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const user = await DB.prepare(
        'SELECT id, email, nombre, password_hash, puntos FROM usuarios WHERE email = ?'
      ).bind(email).first();
      
      if (!user) {
        return new Response(JSON.stringify({
          error: 'Usuario no encontrado'
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Comparación directa (sin hash para simplificar inicio)
      if (password !== user.password_hash) {
        return new Response(JSON.stringify({
          error: 'Contraseña incorrecta'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const token = 'token_' + user.id;
      
      return new Response(JSON.stringify({
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          puntos: user.puntos
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`
        }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error en el servidor',
        details: error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // REGISTER
  if (path === '/api/auth/register' && request.method === 'POST') {
    try {
      const data = await request.json();
      const { email, nombre, password } = data;
      
      if (!email || !password) {
        return new Response(JSON.stringify({
          error: 'Email y contraseña requeridos'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const existingUser = await DB.prepare(
        'SELECT id FROM usuarios WHERE email = ?'
      ).bind(email).first();
      
      if (existingUser) {
        return new Response(JSON.stringify({
          error: 'El email ya está registrado'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const result = await DB.prepare(
        'INSERT INTO usuarios (email, nombre, password_hash, puntos) VALUES (?, ?, ?, ?)'
      ).bind(email, nombre || '', password, 0).run();
      
      const token = 'token_' + result.meta.last_row_id;
      
      return new Response(JSON.stringify({
        success: true,
        token: token,
        user: {
          id: result.meta.last_row_id,
          email: email,
          nombre: nombre || '',
          puntos: 0
        }
      }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`
        }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error en el servidor',
        details: error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Método no permitido
  return new Response(JSON.stringify({
    error: 'Método no permitido. Usa POST.'
  }), { 
    status: 405,
    headers: { 
      'Content-Type': 'application/json',
      'Allow': 'POST'
    }
  });
}