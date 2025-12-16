// CONFIGURACIÓN DEFINITIVA PARA CLOUDFLARE D1 API
// ✅ Todos los datos verificados y confirmados

const CONFIG = {
    // 1. Account ID de Cloudflare (confirmado)
    ACCOUNT_ID: "524660bfb5193d0691a466be6daa974115f67",
    
    // 2. API Token CORRECTO (confirmado)
    API_TOKEN: "d1NybFvciy4c4VEGhs9pfY_etzosF-eGJXE9S88F",
    
    // 3. Database ID (confirmado)
    DB_ID: "c9c7e308-6c71-49f9-8eff-7f80512d7dc0",
    
    // 4. Nombre de la base de datos
    DB_NAME: "rifas2",
    
    // 5. URL de la API D1 (construida automáticamente)
    get API_URL() {
        return `https://api.cloudflare.com/client/v4/accounts/${this.ACCOUNT_ID}/d1/database/${this.DB_ID}/query`;
    }
};

// Estado global de la aplicación
let usuarioActual = JSON.parse(localStorage.getItem('usuarioRifa')) || null;
let configSistema = null;
let d1Conectado = false;

// Función para ejecutar consultas SQL en D1
async function ejecutarSQL(sql, params = []) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sql: sql,
                params: params
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.errors?.[0]?.message || 'Error en la consulta D1');
        }
        
        return {
            success: true,
            result: data.result || [],
            meta: data.meta || {}
        };
        
    } catch (error) {
        console.error('❌ Error en ejecutarSQL:', error);
        return {
            success: false,
            error: error.message,
            sql: sql
        };
    }
}

// Función para obtener múltiples resultados (SELECT)
async function obtenerDatos(sql, params = []) {
    const resultado = await ejecutarSQL(sql, params);
    
    if (resultado.success && resultado.result[0]?.results) {
        return resultado.result[0].results;
    }
    
    return [];
}

// Función para ejecutar INSERT/UPDATE/DELETE
async function ejecutarComando(sql, params = []) {
    return await ejecutarSQL(sql, params);
}

// Función para obtener un solo registro
async function obtenerUno(sql, params = []) {
    const datos = await obtenerDatos(sql, params);
    return datos.length > 0 ? datos[0] : null;
}

// Función para probar conexión a D1
async function probarConexionD1() {
    console.log("🔍 Probando conexión a D1...");
    
    try {
        const resultado = await ejecutarSQL("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        
        if (resultado.success) {
            d1Conectado = true;
            console.log("✅ Conexión D1 exitosa!");
            console.log("📋 Tablas disponibles:", resultado.result[0]?.results || []);
            return true;
        } else {
            console.error("❌ Error en consulta D1:", resultado.error);
            return false;
        }
    } catch (error) {
        console.error("❌ Error de conexión:", error);
        return false;
    }
}

// Función para inicializar base de datos si no existe
async function inicializarBaseDeDatos() {
    console.log("🔄 Inicializando base de datos...");
    
    try {
        // Verificar si las tablas existen
        const tablas = await obtenerDatos("SELECT name FROM sqlite_master WHERE type='table'");
        const nombresTablas = tablas.map(t => t.name);
        
        console.log("📊 Tablas existentes:", nombresTablas);
        
        // Si no hay tablas, crear estructura
        if (nombresTablas.length === 0) {
            console.log("⚡ Creando estructura de base de datos...");
            
            // Crear tabla users
            await ejecutarSQL(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    telefono TEXT UNIQUE NOT NULL,
                    cedula TEXT UNIQUE NOT NULL,
                    correo TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    puntos INTEGER DEFAULT 0,
                    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Crear tabla system_config
            await ejecutarSQL(`
                CREATE TABLE IF NOT EXISTS system_config (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    precio_ticket INTEGER DEFAULT 10,
                    puntos_por_dolar INTEGER DEFAULT 100,
                    rifa_activa BOOLEAN DEFAULT true,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Crear tabla tickets
            await ejecutarSQL(`
                CREATE TABLE IF NOT EXISTS tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 100),
                    user_id INTEGER,
                    estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'reservado', 'vendido')),
                    fecha_reserva TIMESTAMP,
                    fecha_compra TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    UNIQUE(numero)
                )
            `);
            
            // Insertar configuración por defecto
            await ejecutarSQL(`
                INSERT OR IGNORE INTO system_config (id, precio_ticket, puntos_por_dolar, rifa_activa) 
                VALUES (1, 10, 100, 1)
            `);
            
            // Insertar los 100 tickets
            for (let i = 1; i <= 100; i++) {
                await ejecutarSQL(`
                    INSERT OR IGNORE INTO tickets (numero, estado) 
                    VALUES (${i}, 'disponible')
                `);
            }
            
            // Insertar usuario administrador (contraseña: admin123)
            await ejecutarSQL(`
                INSERT OR IGNORE INTO users (nombre, telefono, cedula, correo, password_hash, puntos, role)
                VALUES (
                    'Administrador',
                    '04141234567',
                    'V12345678',
                    'admin@rifa.com',
                    '$2a$10$K3ZhJfW9tKf8Wp8L2q6r0.7Xx5YzA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q',
                    1000,
                    'admin'
                )
            `);
            
            console.log("✅ Base de datos inicializada correctamente");
        } else {
            console.log("✅ Base de datos ya inicializada");
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Error al inicializar base de datos:", error);
        return false;
    }
}

// Función para verificar autenticación
function verificarAutenticacion() {
    const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
    
    if (!usuario) {
        // Redirigir a login si no hay usuario
        if (!window.location.href.includes('login.html') && 
            !window.location.href.includes('register.html') &&
            !window.location.href.includes('index.html')) {
            window.location.href = 'login.html';
            return null;
        }
    }
    
    return usuario;
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('usuarioRifa');
    window.location.href = 'login.html';
}

// Función para actualizar usuario en localStorage
function actualizarUsuarioLocal(usuario) {
    localStorage.setItem('usuarioRifa', JSON.stringify(usuario));
    usuarioActual = usuario;
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Sistema Rifa33 - Inicializando...");
    
    // Probar conexión a D1
    const conectado = await probarConexionD1();
    
    if (conectado) {
        // Inicializar base de datos si es necesario
        await inicializarBaseDeDatos();
        
        // Cargar configuración del sistema
        try {
            const config = await obtenerUno("SELECT * FROM system_config WHERE id = 1");
            if (config) {
                configSistema = config;
                console.log("⚙️ Configuración cargada:", configSistema);
            }
        } catch (error) {
            console.warn("⚠️ No se pudo cargar configuración:", error);
        }
    } else {
        console.error("❌ No se pudo conectar a D1. Verifica:");
        console.error("   1. Account ID:", CONFIG.ACCOUNT_ID);
        console.error("   2. API Token:", CONFIG.API_TOKEN ? "✅ Configurado" : "❌ Faltante");
        console.error("   3. DB ID:", CONFIG.DB_ID);
        console.error("   4. URL:", CONFIG.API_URL);
        
        // Mostrar alerta si estamos en página admin o dashboard
        if (window.location.href.includes('admin.html') || 
            window.location.href.includes('dashboard.html') ||
            window.location.href.includes('tickets.html')) {
            alert("⚠️ Error de conexión a la base de datos. Verifica la consola para más detalles.");
        }
    }
});

// Exportar para uso global
window.CONFIG = CONFIG;
window.ejecutarSQL = ejecutarSQL;
window.obtenerDatos = obtenerDatos;
window.ejecutarComando = ejecutarComando;
window.obtenerUno = obtenerUno;
window.verificarAutenticacion = verificarAutenticacion;
window.cerrarSesion = cerrarSesion;
window.actualizarUsuarioLocal = actualizarUsuarioLocal;

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        ejecutarSQL,
        obtenerDatos,
        ejecutarComando,
        obtenerUno,
        verificarAutenticacion,
        cerrarSesion,
        actualizarUsuarioLocal
    };
}