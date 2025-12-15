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
      // Hash the password (SHA-256 with salt) before storing in password_hash
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2,'0')).join('');
      const encoder = new TextEncoder();
      const dataToHash = encoder.encode(salt + password);
      const digest = await crypto.subtle.digest('SHA-256', dataToHash);
      const hashHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
      const storedHash = `${salt}$${hashHex}`;

      // Try a robust insertion sequence that works regardless of whether the legacy
      // `password` column exists or not. Some D1 instances may not report PRAGMA reliably,
      // so we attempt an INSERT that includes `password` first (most compatible), and if
      // the DB complains that the column doesn't exist, we retry without it.

      const insertWithPasswordSql = 'INSERT INTO usuarios (nombre, email, telefono, password, password_hash, creditos) VALUES (?, ?, ?, ?, ?, 100)';
      const insertWithoutPasswordSql = 'INSERT INTO usuarios (nombre, email, telefono, password_hash, creditos) VALUES (?, ?, ?, ?, 100)';

      let triedWithout = false;
      try {
        console.log('Intentando INSERT incluyendo `password`...');
        result = await db.prepare(insertWithPasswordSql).bind(nombre, email, telefono || '', storedHash, storedHash).run();
        console.log('INSERT con password exitoso:', result);
      } catch (firstErr) {
        console.log('ERROR en primer INSERT (con password):', firstErr && firstErr.message ? firstErr.message : firstErr);
        // If the error indicates the column doesn't exist, try without the column.
        const msg = firstErr && firstErr.message ? firstErr.message.toLowerCase() : '';
        if (msg.includes('no such column') || msg.includes('no such table') || msg.includes('unknown column')) {
          console.log('La columna `password` parece no existir, intentando INSERT sin `password`...');
          triedWithout = true;
          result = await db.prepare(insertWithoutPasswordSql).bind(nombre, email, telefono || '', storedHash).run();
          console.log('INSERT sin password exitoso:', result);
        } else {
          // Re-throw to be handled by outer catch/fallback logic
          throw firstErr;
        }
      }

      console.log('INSERT exitoso:', result);
      console.log('Last row ID:', result.meta?.last_row_id || result.lastInsertId);
    } catch (insertError) {
      console.log('ERROR en INSERT:', insertError && insertError.message ? insertError.message : insertError);
      console.log('Full insertError:', insertError);

      // Intentar un fallback una vez para cubrir casos donde la columna `password` existe pero
      // no se pudo insertar inicialmente (por ejemplo, por condiciones extrañas en D1).
      try {
        console.log('Intentando fallback incluyendo `password` en INSERT (final retry)...');
        const salt2 = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2,'0')).join('');
        const encoder2 = new TextEncoder();
        const dataToHash2 = encoder2.encode(salt2 + password);
        const digest2 = await crypto.subtle.digest('SHA-256', dataToHash2);
        const hashHex2 = Array.from(new Uint8Array(digest2)).map(b => b.toString(16).padStart(2,'0')).join('');
        const storedHash2 = `${salt2}$${hashHex2}`;

        result = await db.prepare(
          'INSERT INTO usuarios (nombre, email, telefono, password, password_hash, creditos) VALUES (?, ?, ?, ?, ?, 100)'
        ).bind(nombre, email, telefono || '', storedHash2, storedHash2).run();

        console.log('INSERT fallback exitoso (final retry):', result);
      } catch (fallbackErr) {
        console.log('ERROR en INSERT fallback (final retry):', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
        console.log('Full fallbackErr:', fallbackErr);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Error insertando usuario (fallback): ' + (fallbackErr && fallbackErr.message ? fallbackErr.message : String(fallbackErr))
        }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
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