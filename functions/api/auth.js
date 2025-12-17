export async function onRequestGet(context) {
    return new Response(JSON.stringify({ status: "ok", message: "Auth endpoint" }), {
        headers: { "Content-Type": "application/json" }
    });
}
