// _middleware.js - Middleware de autenticación
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  
  // Rutas públicas
  const publicPaths = [
    '/api/auth/register',
    '/api/auth/login',
    '/',
    '/index.html',
    '/register.html',
    '/admin.html',
    '/assets/'
  ];
  
  const isPublicPath = publicPaths.some(path => 
    url.pathname === path || url.pathname.startsWith(path)
  );
  
  if (isPublicPath) {
    return next();
  }
  
  // Para rutas protegidas, verificar token
  const authHeader = request.headers.get('Authorization');
  let token;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [key, val] = c.trim().split('=');
          return [key, val];
        })
      );
      token = cookies.auth_token;
    }
  }
  
  if (!token) {
    return new Response(JSON.stringify({
      error: 'No autorizado - Token requerido'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Token simple (sin JWT complejo para empezar)
  if (!token.startsWith('token_')) {
    return new Response(JSON.stringify({
      error: 'Token inválido'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return next();
}