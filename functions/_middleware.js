// Middleware para funciones de Cloudflare Workers 
// /functions/_middleware.js - Middleware global
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  
  // Rutas públicas que no requieren autenticación
  const publicPaths = [
    '/api/auth/register',
    '/api/auth/login',
    '/',
    '/index.html',
    '/register.html',
    '/admin.html',
    '/assets/'
  ];
  
  // Verificar si es una ruta pública
  const isPublicPath = publicPaths.some(path => 
    url.pathname === path || url.pathname.startsWith(path)
  );
  
  if (isPublicPath) {
    return next();
  }
  
  // Para rutas protegidas, verificar autenticación
  try {
    // Obtener token del header Authorization o de cookies
    const authHeader = request.headers.get('Authorization');
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieHeader = request.headers.get('Cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
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
    
    // Verificar token (función simplificada)
    function verificarToken(token) {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
      } catch {
        return null;
      }
    }
    
    const payload = verificarToken(token);
    if (!payload) {
      return new Response(JSON.stringify({
        error: 'Token inválido o expirado'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Añadir información del usuario al contexto
    const newContext = {
      ...context,
      user: {
        id: payload.sub,
        email: payload.email
      }
    };
    
    return next();
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error de autenticación',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}