export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { apuesta, userId } = await request.json();
    
    if (!apuesta || !userId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan parámetros: apuesta y userId son requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    
    // Verificar saldo del usuario
    const usuario = await db.prepare(`
      SELECT creditos FROM usuarios WHERE id = ?
    `).get(userId);

    if (!usuario) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Usuario no encontrado' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar apuesta mínima y máxima
    const tasas = await db.prepare(`
      SELECT * FROM config_tasas WHERE tipo IN ('dados_apuesta_min', 'dados_apuesta_max')
    `).all();

    const tasasObj = {};
    tasas.results.forEach(tasa => {
      tasasObj[tasa.tipo] = tasa.valor;
    });

    const apuestaMin = tasasObj.dados_apuesta_min || 5;
    const apuestaMax = tasasObj.dados_apuesta_max || 100;

    if (apuesta < apuestaMin || apuesta > apuestaMax) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Apuesta debe estar entre ${apuestaMin} y ${apuestaMax} créditos` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (usuario.creditos < apuesta) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Créditos insuficientes' 
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

    let resultado = '';
    let creditosGanados = 0;
    let nuevaRonda = false;

    // Verificar doble 6 (12) - Juega otra ronda
    if (usuarioTotal === 12 || computadoraTotal === 12) {
      resultado = 'doble_seis';
      nuevaRonda = true;
      creditosGanados = 0; // No se gana ni pierde en esta ronda
    } 
    // Verificar ganador
    else if (usuarioTotal > computadoraTotal) {
      resultado = 'ganador';
      creditosGanados = apuesta * 2; // Gana el doble de su apuesta
    } else if (usuarioTotal < computadoraTotal) {
      resultado = 'perdedor';
      creditosGanados = 0; // Pierde su apuesta
    } else {
      resultado = 'empate';
      nuevaRonda = true;
      creditosGanados = 0; // No se gana ni pierde en empate
    }

    // Actualizar créditos del usuario
    if (!nuevaRonda) {
      const nuevoSaldo = usuario.creditos - apuesta + creditosGanados;
      await db.prepare(`
        UPDATE usuarios SET creditos = ? WHERE id = ?
      `).run(nuevoSaldo, userId);
    }

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
        nuevoSaldo: nuevaRonda ? usuario.creditos : (usuario.creditos - apuesta + creditosGanados)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error jugando dados:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}