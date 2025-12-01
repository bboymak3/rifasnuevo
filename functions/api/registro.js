export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { nombre, email, telefono, password } = await request.json();
    
    if (!nombre || !email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan campos obligatorios: nombre, email, password' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // ✅ CORREGIDO: Usar .bind() en lugar de ?
    const usuarioExistente = await db.prepare(
      'SELECT id FROM usuarios WHERE email = ?'
    ).bind(email).first();
    
    if (usuarioExistente) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'El email ya está registrado' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const passwordHash = password;

    // ✅ CORREGIDO: Usar .bind() para todos los parámetros
    const result = await db.prepare(
      'INSERT INTO usuarios (nombre, email, telefono, password_hash, creditos) VALUES (?, ?, ?, ?, 100)'
    ).bind(nombre, email, telefono || '', passwordHash).run();

    return new Response(JSON.stringify({
      success: true,
      data: { 
        id: result.meta.last_row_id,
        nombre: nombre,
        email: email,
        telefono: telefono || '',
        creditos: 100
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}