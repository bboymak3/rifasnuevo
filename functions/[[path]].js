// [[path]].js - API para rifas
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Endpoint de prueba
  if (pathname === '/api/test') {
    return new Response(JSON.stringify({
      success: true,
      message: 'API funcionando'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Endpoint para números
  if (pathname === '/api/numeros') {
    try {
      // Crear tabla si no existe
      await DB.exec(`
        CREATE TABLE IF NOT EXISTS numeros_rifa (
          id INTEGER PRIMARY KEY,
          estado TEXT DEFAULT 'disponible'
        )
      `);
      
      // Contar números existentes
      const count = await DB.prepare('SELECT COUNT(*) as total FROM numeros_rifa').first();
      
      // Si no hay números, insertar 100
      if (count.total === 0) {
        for (let i = 1; i <= 100; i++) {
          await DB.prepare('INSERT INTO numeros_rifa (id) VALUES (?)').bind(i).run();
        }
      }
      
      // Obtener todos los números
      const result = await DB.prepare('SELECT * FROM numeros_rifa ORDER BY id').all();
      
      return new Response(JSON.stringify({
        success: true,
        numeros: result.results || []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500 });
    }
  }
  
  return context.next();
}