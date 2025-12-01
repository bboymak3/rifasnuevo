// functions/api/jugar-dados.js
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
    
    const { userId, apuesta } = data;
    
    console.log('🎲 Juego de dados solicitado:', { userId, apuesta });
    
    // Validaciones básicas
    if (!userId || !apuesta) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Se requiere userId y apuesta' 
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

    if (apuesta < 10 || apuesta > 500) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'La apuesta debe estar entre 10 y 500 créditos' 
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
    
    // 1. Verificar usuario y créditos
    const usuario = await db.prepare(
      'SELECT id, nombre, creditos FROM usuarios WHERE id = ?'
    ).bind(userId).first();

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

    // Verificar créditos suficientes
    if (usuario.creditos < apuesta) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Créditos insuficientes. Disponibles: ${usuario.creditos}, Necesarios: ${apuesta}` 
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

    // 2. Generar resultados de dados
    const usuarioDado1 = Math.floor(Math.random() * 6) + 1;
    const usuarioDado2 = Math.floor(Math.random() * 6) + 1;
    const computadoraDado1 = Math.floor(Math.random() * 6) + 1;
    const computadoraDado2 = Math.floor(Math.random() * 6) + 1;
    
    const usuarioTotal = usuarioDado1 + usuarioDado2;
    const computadoraTotal = computadoraDado1 + computadoraDado2;

    // 3. Determinar resultado
    let resultado = '';
    let creditosGanados = 0;
    let creditosPerdidos = 0;
    let mensaje = '';

    if (usuarioDado1 === 6 && usuarioDado2 === 6) {
      // Doble 6 - gana el doble
      resultado = 'DOBLE 6';
      creditosGanados = apuesta * 2;
      mensaje = '¡DOBLE 6! ¡GANASTE EL DOBLE!';
    } else if (computadoraDado1 === 6 && computadoraDado2 === 6) {
      // Computadora saca doble 6
      resultado = 'PERDEDOR';
      creditosPerdidos = apuesta;
      mensaje = 'La computadora sacó DOBLE 6';
    } else if (usuarioTotal > computadoraTotal) {
      // Usuario gana
      resultado = 'GANADOR';
      creditosGanados = apuesta;
      mensaje = '¡GANASTE!';
    } else if (usuarioTotal < computadoraTotal) {
      // Computadora gana
      resultado = 'PERDEDOR';
      creditosPerdidos = apuesta;
      mensaje = '¡PERDISTE!';
    } else {
      // Empate
      resultado = 'EMPATE';
      mensaje = '¡EMPATE!';
    }

    // 4. Actualizar créditos del usuario
    const nuevosCreditos = usuario.creditos + creditosGanados - creditosPerdidos;
    
    await db
      .prepare('UPDATE usuarios SET creditos = ? WHERE id = ?')
      .bind(nuevosCreditos, userId)
      .run();

    // 5. Registrar en historial
    const fecha = new Date().toISOString();
    
    await db
      .prepare(`
        INSERT INTO historial_dados (
          usuario_id, apuesta, resultado, creditos_ganados,
          creditos_anteriores, creditos_nuevos, fecha_juego,
          usuario_dados, computadora_dados
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        apuesta,
        resultado,
        creditosGanados,
        usuario.creditos,
        nuevosCreditos,
        fecha,
        JSON.stringify([usuarioDado1, usuarioDado2]),
        JSON.stringify([computadoraDado1, computadoraDado2])
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        resultado: resultado,
        mensaje: mensaje,
        dados: {
          usuario: {
            dado1: usuarioDado1,
            dado2: usuarioDado2,
            total: usuarioTotal
          },
          computadora: {
            dado1: computadoraDado1,
            dado2: computadoraDado2,
            total: computadoraTotal
          }
        },
        creditos: {
          apuesta: apuesta,
          ganados: creditosGanados,
          perdidos: creditosPerdidos,
          anteriores: usuario.creditos,
          nuevos: nuevosCreditos
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
    console.error('💥 ERROR en jugar-dados:', error);
    
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