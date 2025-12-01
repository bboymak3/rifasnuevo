export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { email, telefono, password } = await request.json();
    
    // Aceptar email O teléfono
    const loginId = email || telefono;
    
    if (!loginId || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan credenciales' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Buscar usuario por email o teléfono
    const usuario = await db.prepare(`
      SELECT id, nombre, email, telefono, password_hash, creditos 
      FROM usuarios WHERE email = ? OR telefono = ?
    `).get(loginId, loginId);

    if (!usuario) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Credenciales incorrectas' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar contraseña (considera usar bcrypt en producción)
    if (usuario.password_hash !== password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Credenciales incorrectas' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        creditos: usuario.creditos
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}