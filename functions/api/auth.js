// auth.js - VERSIÓN MÍNIMA FUNCIONAL
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // LOGIN
  if (path === '/api/auth/login' && request.method === 'POST') {
    return new Response(JSON.stringify({
      success: true,
      token: 'test_token',
      user: { id: 1, email: 'test@test.com', puntos: 0 }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // REGISTER  
  if (path === '/api/auth/register' && request.method === 'POST') {
    return new Response(JSON.stringify({
      success: true,
      token: 'test_token',
      user: { id: 1, email: 'test@test.com', puntos: 0 }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    error: 'Método no permitido'
  }), { 
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}