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
      .prepare('SELECT id, nombre, email, telefono, password, password_hash, creditos FROM usuarios WHERE email = ?')
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

    // Verificar contraseña: preferimos `password_hash` si existe (formato salt$hex)
    if (user.password_hash && user.password_hash.includes('$')) {
      try {
        const [salt, hashHex] = user.password_hash.split('$');
        const encoder = new TextEncoder();
        const data = encoder.encode(salt + password);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const passwordHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
        if (passwordHex !== hashHex) {
          return new Response(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (err) {
        console.error('Error verificando hash:', err);
        return new Response(JSON.stringify({ success: false, error: 'Error verificando contraseña' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      // Fallback (legacy): compare plaintext `password` column; if matches, upgrade to hash
      if (user.password !== password) {
        return new Response(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      // Upgrade: compute hash and save in DB for future logins
      try {
        const saltArr = crypto.getRandomValues(new Uint8Array(12));
        const salt = Array.from(saltArr).map(b => b.toString(16).padStart(2,'0')).join('');
        const encoder = new TextEncoder();
        const data = encoder.encode(salt + password);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const hashHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
        const stored = `${salt}$${hashHex}`;
        await db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').bind(stored, user.id).run();
        console.log('Usuario id='+user.id+' upgradeado con password_hash');
      } catch (err) {
        console.error('Error guardando password_hash:', err);
      }
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