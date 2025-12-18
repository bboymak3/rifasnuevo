// _middleware.js - Corrección para rutas
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Si es una ruta de API, pasarla al handler
  if (url.pathname.startsWith('/api/')) {
    return context.next();
  }
  
  // Para archivos estáticos, servir normalmente
  return context.next();
}