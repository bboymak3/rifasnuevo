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

      // Normalmente devolveremos la recarga como PENDIENTE para que un
      // administrador la verifique manualmente antes de aprobarla.
      const recargaId = recargaResult?.meta?.last_row_id || recargaResult?.lastInsertId || null;
      console.log('✅ Recarga registrada con ID:', recargaId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Recarga registrada y pendiente de verificación por el administrador',
          recarga_id: recargaId,
          creditos_solicitados: creditos_solicitados,
          estado: 'pendiente',
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