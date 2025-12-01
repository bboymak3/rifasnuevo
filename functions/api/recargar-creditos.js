// functions/api/recargar-creditos.js
export async function onRequest(context) {
  const { request, env } = context;
  
  // Configurar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método no permitido' 
      }),
      {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }

  try {
    // Obtener datos
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'JSON inválido' 
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }
    
    const { usuario_id, monto, creditos_solicitados, metodo_pago, referencia_pago, datos_pago } = data;
    
    console.log('📤 Recibiendo solicitud de recarga:', { usuario_id, monto, creditos_solicitados });
    
    // Validaciones básicas
    if (!usuario_id || !monto || !creditos_solicitados || !metodo_pago) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Datos incompletos. Se requiere usuario_id, monto, creditos_solicitados y metodo_pago' 
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    const db = env.DB;
    
    // 1. Verificar usuario
    const usuario = await db.prepare(
      'SELECT id, nombre, creditos FROM usuarios WHERE id = ?'
    ).bind(usuario_id).first();

    if (!usuario) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Usuario no encontrado' 
        }),
        {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    // 2. Registrar la recarga
    const fecha = new Date().toISOString();
    const referencia = referencia_pago || `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Insertar en la tabla recargas
      const recargaResult = await db
        .prepare(`
          INSERT INTO recargas (
            usuario_id, monto, creditos_solicitados, metodo_pago, 
            referencia_pago, estado, fecha_solicitud, datos_pago
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          usuario_id, 
          monto, 
          creditos_solicitados, 
          metodo_pago,
          referencia,
          'pendiente', // Estado inicial
          fecha,
          JSON.stringify(datos_pago || {})
        )
        .run();

      console.log('✅ Recarga registrada con ID:', recargaResult.lastInsertId);
      
      // En un sistema real, aquí enviaríamos notificación al administrador
      // y procesaríamos el pago. Por ahora, simulamos aprobación automática.
      
      // 3. Aprobar automáticamente (para desarrollo)
      // En producción, esto debería hacerse manualmente después de verificar el pago
      await db
        .prepare(`
          UPDATE recargas 
          SET estado = 'aprobado', fecha_procesado = ?, administrador_id = 1
          WHERE id = ?
        `)
        .bind(fecha, recargaResult.lastInsertId)
        .run();

      // 4. Añadir créditos al usuario
      const nuevosCreditos = usuario.creditos + creditos_solicitados;
      
      await db
        .prepare('UPDATE usuarios SET creditos = ? WHERE id = ?')
        .bind(nuevosCreditos, usuario_id)
        .run();

      // 5. Registrar en el historial (opcional)
      await db
        .prepare(`
          INSERT INTO historial_dados (
            usuario_id, apuesta, resultado, creditos_ganados,
            creditos_anteriores, creditos_nuevos, fecha_juego
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          usuario_id,
          0, // No es una apuesta
          'recarga_creditos',
          creditos_solicitados,
          usuario.creditos,
          nuevosCreditos,
          fecha
        )
        .run();

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Recarga procesada exitosamente',
          recarga_id: recargaResult.lastInsertId,
          nuevos_creditos: nuevosCreditos,
          creditos_agregados: creditos_solicitados,
          estado: 'aprobado',
          referencia: referencia,
          fecha: fecha
        }),
        {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );

    } catch (dbError) {
      console.error('💥 Error en base de datos:', dbError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error al procesar la recarga en la base de datos',
          details: dbError.message 
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

  } catch (error) {
    console.error('💥 ERROR general en recarga-creditos:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
}