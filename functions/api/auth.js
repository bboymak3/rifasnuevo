// auth.js - FUNCIONAL BÁSICO
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log("📨 Petición a:", path, "Método:", request.method);
  
  // LOGIN
  if (path === '/api/login' && request.method === 'POST') {
    try {
      const data = await request.json();
      console.log("Login attempt:", data.email);
      
      return new Response(JSON.stringify({
        success: true,
        token: 'token_test_1',
        user: {
          id: 1,
          email: data.email,
          nombre: 'Usuario Test',
          puntos: 100
        }
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error en login'
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
      console.log("Register attempt:", data.email);
      
      return new Response(JSON.stringify({
        success: true,
        token: 'token_test_2',
        user: {
          id: 2,
          email: data.email,
          nombre: data.nombre || '',
          puntos: 0
        }
      }), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error en registro'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Si llega aquí, es método no permitido
  return new Response(JSON.stringify({
    error: 'Método no permitido para esta ruta',
    ruta: path,
    metodo_requerido: 'POST'
  }), { 
    status: 405,
    headers: { 
      'Content-Type': 'application/json',
      'Allow': 'POST'
    }
  });
}