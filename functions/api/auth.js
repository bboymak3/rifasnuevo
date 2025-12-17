// Endpoints de autenticacion 
// /functions/api/auth.js

// Función para generar JWT simple
function generarToken(userId, email) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
  }));
  const signature = btoa('firma_simulada');
  
  return `${header}.${payload}.${signature}`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Registrar usuario
  if (path === '/api/auth/register' && request.method === 'POST') {
    try {
      const data = await request.json();
      const { email, nombre, password } = data;
      
      // Validaciones básicas
      if (!email || !password) {
        return new Response(JSON.stringify({
          error: 'Email y contraseña son requeridos'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar si el usuario ya existe
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
      
      // Hash de la contraseña (simplificado)
      const passwordHash = btoa(password);
      
      // Insertar nuevo usuario
      const result = await DB.prepare(
        'INSERT INTO usuarios (email, nombre, password_hash, puntos) VALUES (?, ?, ?, ?)'
      ).bind(email, nombre || '', passwordHash, 0).run();
      
      // Generar token JWT
      const token = generarToken(result.meta.last_row_id, email);
      
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
          'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; Max-Age=86400`
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
  
  // Login de usuario
  if (path === '/api/auth/login' && request.method === 'POST') {
    try {
      const data = await request.json();
      const { email, password } = data;
      
      if (!email || !password) {
        return new Response(JSON.stringify({
          error: 'Email y contraseña son requeridos'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Buscar usuario
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
      
      // Verificar contraseña (simplificado)
      const passwordHash = btoa(password);
      if (passwordHash !== user.password_hash) {
        return new Response(JSON.stringify({
          error: 'Contraseña incorrecta'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Generar token JWT
      const token = generarToken(user.id, user.email);
      
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
          'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; Max-Age=86400`
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
  
  // Ruta no encontrada
  return new Response(JSON.stringify({
    error: 'Ruta no encontrada'
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}