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
    
    // Verificar si el usuario ya existe
    const usuarioExistente = await db.prepare(`
      SELECT id FROM usuarios WHERE email = ?
    `).get(email);

    if (usuarioExistente) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'El email ya está registrado' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // En una aplicación real, aquí deberías hashear la contraseña
    // const passwordHash = await bcrypt.hash(password, 10);
    const passwordHash = password; // Por simplicidad en este ejemplo

    // Insertar nuevo usuario
    const result = await db.prepare(`
      INSERT INTO usuarios (nombre, email, telefono, password_hash, creditos)
      VALUES (?, ?, ?, ?, 100)
    `).run(nombre, email, telefono, passwordHash);

    return new Response(JSON.stringify({
      success: true,
      data: { 
        id: result.lastInsertRowid,
        nombre: nombre,
        email: email,
        telefono: telefono,
        creditos: 100
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}