export async function onRequest(context) {
  console.log('=== INICIANDO REGISTRO ===');
  
  try {
    // 1. Verificar método
    if (context.request.method !== 'POST') {
      console.log('Método incorrecto:', context.request.method);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Método no permitido' 
      }), { 
        status: 405, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 2. Parsear body
    let data;
    try {
      const text = await context.request.text();
      console.log('Body raw:', text);
      data = JSON.parse(text);
      console.log('Datos parseados:', JSON.stringify(data));
    } catch (parseError) {
      console.log('Error parseando JSON:', parseError.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'JSON inválido' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { nombre, email, telefono, password } = data;
    console.log('Campos extraídos:', { nombre, email, telefono, password });

    // 3. Validar campos
    if (!nombre || !email || !password) {
      console.log('Campos faltantes');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan campos: nombre, email, password' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 4. Verificar DB
    const db = context.env.DB;
    if (!db) {
      console.log('ERROR: DB no disponible en context.env');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Configuración DB faltante' 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    console.log('DB disponible');

    // 5. Probar conexión a DB
    try {
      const testQuery = await db.prepare('SELECT 1 as test').first();
      console.log('Test DB exitoso:', testQuery);
    } catch (dbTestError) {
      console.log('ERROR test DB:', dbTestError.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error DB: ' + dbTestError.message 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 6. Verificar si usuario existe
    let usuarioExistente;
    try {
      usuarioExistente = await db.prepare(
        'SELECT id FROM usuarios WHERE email = ?'
      ).bind(email).first();
      console.log('Usuario existente check:', usuarioExistente);
    } catch (queryError) {
      console.log('ERROR en query SELECT:', queryError.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error verificando usuario: ' + queryError.message 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (usuarioExistente) {
      console.log('Usuario ya existe');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email ya registrado' 
      }), { 
        status: 409, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 7. Insertar usuario
    console.log('Insertando nuevo usuario...');
    let result;
    try {
      // Nota: la tabla `usuarios` utiliza la columna `password` (no password_hash)
      result = await db.prepare(
        'INSERT INTO usuarios (nombre, email, telefono, password, creditos) VALUES (?, ?, ?, ?, 100)'
      ).bind(nombre, email, telefono || '', password).run();
      console.log('INSERT exitoso:', result);
      console.log('Last row ID:', result.meta?.last_row_id || result.lastInsertId);
    } catch (insertError) {
      console.log('ERROR en INSERT:', insertError.message);
      console.log('Stack:', insertError.stack);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error insertando usuario: ' + insertError.message 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 8. Éxito
    console.log('=== REGISTRO EXITOSO ===');
    return new Response(JSON.stringify({
      success: true,
      data: { 
        id: result.meta?.last_row_id || 0,
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
    console.log('=== ERROR NO CAPTURADO ===');
    console.log('Mensaje:', error.message);
    console.log('Stack:', error.stack);
    console.log('=== FIN ERROR ===');
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}