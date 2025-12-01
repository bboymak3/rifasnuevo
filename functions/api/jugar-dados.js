export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    console.log('=== INICIANDO JUEGO DE DADOS ===');
    
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('Body recibido:', body);
    
    const { apuesta, userId } = body;
    
    if (!apuesta || !userId) {
      console.log('Faltan parámetros');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: apuesta y userId son requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Verificar usuario
    console.log('Verificando usuario ID:', userId);
    const usuario = await db.prepare(
      'SELECT id, creditos, nombre FROM usuarios WHERE id = ?'
    ).bind(userId).first();

    if (!usuario) {
      console.log('Usuario no encontrado');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuario no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Usuario encontrado:', usuario.nombre, 'Saldo:', usuario.creditos);

    // Verificar tasas de apuesta (con valores por defecto si no existen)
    let apuestaMin = 5;
    let apuestaMax = 100;
    
    try {
      const tasas = await db.prepare(
        'SELECT tipo, valor FROM config_tasas WHERE tipo IN (?, ?)'
      ).bind('dados_apuesta_min', 'dados_apuesta_max').all();
      
      console.log('Tasas encontradas:', tasas.results);
      
      if (tasas.results && tasas.results.length > 0) {
        tasas.results.forEach(tasa => {
          if (tasa.tipo === 'dados_apuesta_min') apuestaMin = tasa.valor;
          if (tasa.tipo === 'dados_apuesta_max') apuestaMax = tasa.valor;
        });
      }
    } catch (tasaError) {
      console.log('Error cargando tasas, usando valores por defecto:', tasaError.message);
    }

    console.log('Límites de apuesta:', { apuestaMin, apuestaMax, apuestaIntentada: apuesta });

    if (apuesta < apuestaMin) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Apuesta mínima: ${apuestaMin} créditos` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (apuesta > apuestaMax) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Apuesta máxima: ${apuestaMax} créditos` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (usuario.creditos < apuesta) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Créditos insuficientes. Tienes: ' + usuario.creditos 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Lógica del juego
    function tirarDados() {
      return {
        dado1: Math.floor(Math.random() * 6) + 1,
        dado2: Math.floor(Math.random() * 6) + 1
      };
    }

    const usuarioDados = tirarDados();
    const computadoraDados = tirarDados();

    const usuarioTotal = usuarioDados.dado1 + usuarioDados.dado2;
    const computadoraTotal = computadoraDados.dado1 + computadoraDados.dado2;

    console.log('Resultados:', {
      usuario: usuarioDados,
      usuarioTotal: usuarioTotal,
      computadora: computadoraDados,
      computadoraTotal: computadoraTotal
    });

    let resultado = '';
    let creditosGanados = 0;
    let nuevaRonda = false;

    // Reglas del juego
    if (usuarioTotal === 12 || computadoraTotal === 12) {
      resultado = 'doble_seis';
      nuevaRonda = true;
      creditosGanados = 0;
    } else if (usuarioTotal > computadoraTotal) {
      resultado = 'ganador';
      creditosGanados = apuesta * 2;
    } else if (usuarioTotal < computadoraTotal) {
      resultado = 'perdedor';
      creditosGanados = 0;
    } else {
      resultado = 'empate';
      nuevaRonda = true;
      creditosGanados = 0;
    }

    // Actualizar créditos
    let nuevoSaldo;
    if (!nuevaRonda) {
      nuevoSaldo = usuario.creditos - apuesta + creditosGanados;
      console.log('Actualizando saldo:', { saldoAnterior: usuario.creditos, apuesta, creditosGanados, nuevoSaldo });
      
      await db.prepare(
        'UPDATE usuarios SET creditos = ? WHERE id = ?'
      ).bind(nuevoSaldo, userId).run();
    } else {
      nuevoSaldo = usuario.creditos;
      console.log('Nueva ronda, saldo no cambia:', nuevoSaldo);
    }

    console.log('Juego finalizado:', { resultado, nuevaRonda, nuevoSaldo });

    return new Response(JSON.stringify({
      success: true,
      data: {
        resultado: resultado,
        nuevaRonda: nuevaRonda,
        usuario: {
          dados: usuarioDados,
          total: usuarioTotal
        },
        computadora: {
          dados: computadoraDados,
          total: computadoraTotal
        },
        apuesta: apuesta,
        creditosGanados: creditosGanados,
        nuevoSaldo: nuevoSaldo
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('=== ERROR EN JUEGO DE DADOS ===');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    console.error('=== FIN ERROR ===');
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}