export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { password } = body;

    // Contraseña hardcodeada por ahora (luego la moveremos a environment variables)
    const ADMIN_PASSWORD = "rifa2024"; // Puedes cambiar esta contraseña

    if (password === ADMIN_PASSWORD) {
      return new Response(JSON.stringify({
        success: true,
        message: "Acceso concedido"
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Contraseña incorrecta"
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno: ' + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}