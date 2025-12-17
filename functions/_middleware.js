// Middleware básico
export const onRequest = async (context) => {
    // Agrega headers CORS
    const response = await context.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
}
