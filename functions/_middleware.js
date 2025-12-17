export const onRequest = async (context) => {
    return new Response("API funcionando", { 
        headers: { "Content-Type": "text/plain" }
    });
}
