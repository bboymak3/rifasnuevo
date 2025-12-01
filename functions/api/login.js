export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { email, password } = await request.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan campos: email y password' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Buscar usuario
    const usuario = await db.prepare(`
      SELECT id, nombre, email, telefono, password_hash, creditos 
      FROM usuarios WHERE email = ?
    `).get(email);

    if (!usuario) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Credenciales incorrectas' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar contraseña (en producción usar bcrypt.compare)
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