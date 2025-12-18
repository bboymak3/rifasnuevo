// api.js - Versión simplificada para debug
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  console.log('Petición a:', pathname);
  
  // Solo un endpoint para pruebas
  if (pathname === '/api/numeros' && request.method === 'GET') {
    try {
      console.log('Probando conexión a la base de datos...');
      
      // 1. Primero probar si podemos ejecutar una consulta simple
      const testQuery = await DB.prepare('SELECT 1 as test').first();
      console.log('Test query resultado:', testQuery);
      
      // 2. Verificar tablas existentes
      const tables = await DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all();
      
      console.log('Tablas encontradas:', tables.results);
      
      // 3. Verificar si existe numeros_rifa
      const numerosRifaExists = tables.results.some(t => t.name === 'numeros_rifa');
      
      let numeros = [];
      
      if (numerosRifaExists) {
        // Si existe, obtener los números
        const result = await DB.prepare(
          'SELECT id, estado FROM numeros_rifa ORDER BY id LIMIT 10'
        ).all();
        numeros = result.results || [];
      } else {
        // Si no existe, crear datos de prueba
        console.log('Tabla numeros_rifa no existe. Creando datos de prueba...');
        for (let i = 1; i <= 10; i++) {
          numeros.push({
            id: i,
            estado: 'disponible',
            telefono_comprador: null,
            banco: null,
            fecha_compra: null
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'API funcionando',
        debug: {
          conexion_db: 'OK',
          tablas_existentes: tables.results.map(t => t.name),
          tabla_numeros_rifa: numerosRifaExists,
          timestamp: new Date().toISOString()
        },
        numeros: numeros
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } catch (error) {
      console.error('Error en la API:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Error en la API: ' + error.message,
        stack: error.stack
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Endpoint para crear la tabla
  if (pathname === '/api/crear-tabla' && request.method === 'GET') {
    try {
      console.log('Creando tabla numeros_rifa...');
      
      // Crear la tabla
      await DB.exec(`
        CREATE TABLE IF NOT EXISTS numeros_rifa (
          id INTEGER PRIMARY KEY,
          estado TEXT DEFAULT 'disponible',
          telefono_comprador TEXT,
          banco TEXT,
          fecha_compra TEXT
        )
      `);
      
      // Insertar números 1-100
      for (let i = 1; i <= 100; i++) {
        await DB.prepare(
          'INSERT OR IGNORE INTO numeros_rifa (id) VALUES (?)'
        ).bind(i).run();
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Tabla numeros_rifa creada con 100 números'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Error creando tabla: ' + error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Endpoint simple de prueba
  if (pathname === '/api/test' && request.method === 'GET') {
    return new Response(JSON.stringify({
      success: true,
      message: 'API funcionando',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Ruta no encontrada
  return new Response(JSON.stringify({
    success: false,
    error: 'Ruta no encontrada: ' + pathname,
    rutas_disponibles: ['/api/numeros', '/api/test', '/api/crear-tabla']
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}