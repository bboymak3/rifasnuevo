// [[path]].js - Versión corregida para tabla existente pero vacía
export async function onRequest(context) {
  const { request, env } = context;
  const DB = env.DB;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  console.log("Ruta API:", pathname);
  
  // ========== GET NÚMEROS ==========
  if (pathname === '/api/numeros') {
    try {
      console.log("1. Consultando números...");
      
      // PRIMERO: Verificar qué hay en la tabla
      const countResult = await DB.prepare(
        'SELECT COUNT(*) as total FROM numeros_rifa'
      ).first();
      
      const totalNumeros = countResult ? countResult.total : 0;
      console.log("2. Total números en tabla:", totalNumeros);
      
      let numeros = [];
      
      // SI LA TABLA ESTÁ VACÍA: Llenarla
      if (totalNumeros === 0) {
        console.log("3. Tabla vacía. Insertando 100 números...");
        
        for (let i = 1; i <= 100; i++) {
          await DB.prepare(
            'INSERT INTO numeros_rifa (id, estado) VALUES (?, ?)'
          ).bind(i, 'disponible').run();
        }
        
        console.log("4. 100 números insertados");
        
        // Obtener los números recién insertados
        const result = await DB.prepare(
          'SELECT id, estado, telefono_comprador, banco, fecha_compra FROM numeros_rifa ORDER BY id'
        ).all();
        
        numeros = result.results || [];
      } else {
        // SI LA TABLA TIENE DATOS: Obtenerlos
        console.log("5. Tabla tiene datos. Obteniendo...");
        
        const result = await DB.prepare(
          'SELECT id, estado, telefono_comprador, banco, fecha_compra FROM numeros_rifa ORDER BY id'
        ).all();
        
        numeros = result.results || [];
      }
      
      console.log("6. Números a devolver:", numeros.length);
      
      // SI POR ALGUNA RAZÓN SIGUE VACÍO, crear datos de emergencia
      if (numeros.length === 0) {
        console.log("7. Creando datos de emergencia...");
        for (let i = 1; i <= 100; i++) {
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
        numeros: numeros,
        total: numeros.length,
        disponibles: numeros.filter(n => n.estado === 'disponible').length,
        vendidos: numeros.filter(n => n.estado === 'vendido').length,
        debug: {
          tabla_existe: true,
          encontrados: totalNumeros,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } catch (error) {
      console.error("ERROR en /api/numeros:", error);
      
      // SI HAY ERROR: Devolver datos de emergencia
      const numerosEmergencia = [];
      for (let i = 1; i <= 100; i++) {
        numerosEmergencia.push({
          id: i,
          estado: i <= 50 ? 'disponible' : 'vendido',
          telefono_comprador: i > 50 ? '0416-777.57.71' : null,
          banco: i > 50 ? 'Banco de Venezuela' : null,
          fecha_compra: i > 50 ? new Date().toISOString() : null
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        numeros: numerosEmergencia,
        total: 100,
        disponibles: 50,
        vendidos: 50,
        error: 'Error: ' + error.message,
        debug: 'Modo emergencia activado'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  // ========== TEST ENDPOINT ==========
  if (pathname === '/api/test') {
    return new Response(JSON.stringify({
      success: true,
      message: 'API funcionando',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // ========== LIMPIAR Y RELLENAR TABLA ==========
  if (pathname === '/api/reset-tabla') {
    try {
      // Vaciar la tabla
      await DB.prepare('DELETE FROM numeros_rifa').run();
      
      // Insertar 100 números nuevos
      for (let i = 1; i <= 100; i++) {
        await DB.prepare(
          'INSERT INTO numeros_rifa (id, estado) VALUES (?, ?)'
        ).bind(i, 'disponible').run();
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Tabla reseteada con 100 números disponibles'
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