// functions/api/login.js - VERIFICAR
export async function onRequest(context) {
  // ... (código anterior)
  
  try {
    const { email, password } = await context.request.json();
    
    console.log('🔐 Login intentado para:', email);
    
    // Validar
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email y contraseña son requeridos'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const db = context.env.DB;
    
    // Buscar usuario
    const user = await db
      .prepare('SELECT id, nombre, email, telefono, password, creditos FROM usuarios WHERE email = ?')
      .bind(email)
      .first();

    console.log('📋 Usuario encontrado:', user ? 'Sí' : 'No');

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario no encontrado'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verificar contraseña
    if (user.password !== password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Contraseña incorrecta'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Login exitoso para:', user.email);
    
    // ÉXITO: Devolver datos en el formato CORRECTO
    return new Response(
      JSON.stringify({
        success: true,
        user: {  // <-- Asegúrate que sea 'user' no 'data'
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono || '',
          creditos: user.creditos || 0
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('💥 ERROR en login:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}