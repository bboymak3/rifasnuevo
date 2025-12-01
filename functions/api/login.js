// functions/api/login.js - VERSIÓN COMPLETA
export async function onRequest(context) {
  // Configurar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Manejar preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Solo aceptar POST
  if (context.request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Método no permitido. Usa POST.'
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  try {
    // Obtener datos
    const { email, password } = await context.request.json();
    
    console.log('🔍 Intentando login para:', email);

    // Validar
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email y contraseña requeridos'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Acceder a DB (el binding es DB para rifasv2)
    const db = context.env.DB;
    
    if (!db) {
      console.error('❌ DB no está disponible en context.env');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error de configuración de base de datos'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Buscar usuario
    console.log('🔎 Buscando en base de datos...');
    const user = await db
      .prepare('SELECT id, nombre, email, telefono, password, creditos FROM usuarios WHERE email = ?')
      .bind(email)
      .first();

    console.log('📊 Resultado búsqueda:', user ? 'Usuario encontrado' : 'Usuario NO encontrado');

    if (!user) {
      console.log('❌ Usuario no encontrado para email:', email);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario no encontrado'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Verificar contraseña (texto plano por ahora)
    console.log('🔐 Comparando contraseñas...');
    console.log('   Contraseña en DB:', user.password);
    console.log('   Contraseña recibida:', password);
    
    if (user.password !== password) {
      console.log('❌ Contraseña incorrecta');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Contraseña incorrecta'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('✅ Login exitoso para:', user.email);
    
    // Éxito - devolver datos del usuario
    return new Response(
      JSON.stringify({
        success: true,
        user: {
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
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    // Log detallado del error
    console.error('💥 ERROR en login:', error);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
}
