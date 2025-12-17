// Ruta: /api/auth
export async function onRequest(context) {
    return new Response(JSON.stringify({
        status: "ok",
        message: "Auth endpoint",
        timestamp: new Date().toISOString()
    }), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
