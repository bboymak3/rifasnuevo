// admin.js - Funciones específicas para el panel administrativo

// Variables globales del admin
let adminData = {
    stats: {},
    users: [],
    recharges: [],
    tickets: [],
    transactions: []
};

// Inicializar panel administrativo
async function initAdminPanel() {
    try {
        // Verificar que el usuario sea admin
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        if (!usuario || usuario.role !== 'admin') {
            throw new Error('Acceso no autorizado');
        }
        
        // Cargar estadísticas iniciales
        await loadAdminStats();
        
        // Cargar configuración del sistema
        await loadAdminConfig();
        
        // Inicializar gráficos
        initAdminCharts();
        
        return true;
        
    } catch (error) {
        console.error('Error al inicializar panel admin:', error);
        return false;
    }
}

// Cargar estadísticas administrativas
async function loadAdminStats() {
    try {
        const queries = [
            // Usuarios totales
            "SELECT COUNT(*) as total FROM users",
            
            // Usuarios hoy
            "SELECT COUNT(*) as today FROM users WHERE DATE(created_at) = DATE('now')",
            
            // Tickets vendidos
            "SELECT COUNT(*) as sold FROM tickets WHERE estado = 'vendido'",
            
            // Tickets disponibles
            "SELECT COUNT(*) as available FROM tickets WHERE estado = 'disponible'",
            
            // Recargas pendientes
            "SELECT COUNT(*) as pending FROM recargas WHERE estado = 'pendiente'",
            
            // Puntos en circulación
            "SELECT SUM(puntos) as total_points FROM users",
            
            // Ingresos totales (estimado)
            `SELECT 
                (SELECT COUNT(*) FROM tickets WHERE estado = 'vendido') * 
                (SELECT precio_ticket FROM system_config WHERE id = 1) / 
                (SELECT puntos_por_dolar FROM system_config WHERE id = 1) as revenue`
        ];
        
        const statsKeys = [
            'total_users',
            'today_users', 
            'sold_tickets',
            'available_tickets',
            'pending_recharges',
            'total_points',
            'total_revenue'
        ];
        
        adminData.stats = {};
        
        for (let i = 0; i < queries.length; i++) {
            const result = await obtenerUno(queries[i]);
            if (result) {
                adminData.stats[statsKeys[i]] = Object.values(result)[0] || 0;
            }
        }
        
        return adminData.stats;
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        return {};
    }
}

// Cargar usuarios para administración
async function loadAdminUsers(search = '', page = 1, limit = 10) {
    try {
        let whereClause = '';
        if (search) {
            whereClause = `WHERE nombre LIKE '%${search}%' OR telefono LIKE '%${search}%' OR cedula LIKE '%${search}%'`;
        }
        
        const offset = (page - 1) * limit;
        
        const users = await obtenerDatos(`
            SELECT id, nombre, telefono, cedula, correo, puntos, role, created_at
            FROM users
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `);
        
        // Total de usuarios para paginación
        const totalResult = await obtenerUno(`SELECT COUNT(*) as total FROM users ${whereClause}`);
        const total = totalResult ? totalResult.total : 0;
        
        adminData.users = {
            data: users || [],
            total: total,
            page: page,
            limit: limit,
            pages: Math.ceil(total / limit)
        };
        
        return adminData.users;
        
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        return { data: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
}

// Cargar recargas para administración
async function loadAdminRecharges(filter = 'all', page = 1, limit = 10) {
    try {
        let whereClause = '';
        switch(filter) {
            case 'pending':
                whereClause = "WHERE r.estado = 'pendiente'";
                break;
            case 'approved':
                whereClause = "WHERE r.estado = 'aprobado'";
                break;
            case 'rejected':
                whereClause = "WHERE r.estado = 'rechazado'";
                break;
        }
        
        const offset = (page - 1) * limit;
        
        const recharges = await obtenerDatos(`
            SELECT r.*, u.nombre as user_name, u.telefono
            FROM recargas r
            JOIN users u ON r.user_id = u.id
            ${whereClause}
            ORDER BY r.fecha_solicitud DESC
            LIMIT ${limit} OFFSET ${offset}
        `);
        
        // Total para paginación
        const totalResult = await obtenerUno(`SELECT COUNT(*) as total FROM recargas r ${whereClause}`);
        const total = totalResult ? totalResult.total : 0;
        
        adminData.recharges = {
            data: recharges || [],
            total: total,
            page: page,
            limit: limit,
            pages: Math.ceil(total / limit)
        };
        
        return adminData.recharges;
        
    } catch (error) {
        console.error('Error al cargar recargas:', error);
        return { data: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
}

// Aprobar recarga
async function approveRecharge(rechargeId, message = '') {
    try {
        // Obtener datos de la recarga
        const recharge = await obtenerUno(`SELECT * FROM recargas WHERE id = ${rechargeId}`);
        
        if (!recharge) {
            throw new Error('Recarga no encontrada');
        }
        
        // Procesar aprobación
        await ejecutarComando(`
            UPDATE recargas 
            SET estado = 'aprobado', 
                puntos_otorgados = ${recharge.puntos_solicitados},
                mensaje_admin = '${message || "Recarga aprobada"}',
                fecha_resolucion = CURRENT_TIMESTAMP 
            WHERE id = ${rechargeId};
            
            UPDATE users 
            SET puntos = puntos + ${recharge.puntos_solicitados} 
            WHERE id = ${recharge.user_id};
            
            INSERT INTO transacciones (user_id, tipo, puntos, descripcion)
            VALUES (
                ${recharge.user_id}, 
                'recarga', 
                ${recharge.puntos_solicitados}, 
                'Recarga aprobada #${rechargeId}'
            );
        `);
        
        return { success: true, message: 'Recarga aprobada exitosamente' };
        
    } catch (error) {
        console.error('Error al aprobar recarga:', error);
        return { success: false, message: 'Error al aprobar recarga' };
    }
}

// Rechazar recarga
async function rejectRecharge(rechargeId, message = '') {
    try {
        await ejecutarComando(`
            UPDATE recargas 
            SET estado = 'rechazado', 
                mensaje_admin = '${message || "Recarga rechazada"}',
                fecha_resolucion = CURRENT_TIMESTAMP 
            WHERE id = ${rechargeId}
        `);
        
        return { success: true, message: 'Recarga rechazada' };
        
    } catch (error) {
        console.error('Error al rechazar recarga:', error);
        return { success: false, message: 'Error al rechazar recarga' };
    }
}

// Cargar transacciones para administración
async function loadAdminTransactions(startDate = null, endDate = null, page = 1, limit = 20) {
    try {
        let whereClause = '';
        if (startDate && endDate) {
            whereClause = `WHERE DATE(t.fecha) BETWEEN '${startDate}' AND '${endDate}'`;
        }
        
        const offset = (page - 1) * limit;
        
        const transactions = await obtenerDatos(`
            SELECT t.*, u.nombre as user_name, u.telefono
            FROM transacciones t
            JOIN users u ON t.user_id = u.id
            ${whereClause}
            ORDER BY t.fecha DESC
            LIMIT ${limit} OFFSET ${offset}
        `);
        
        // Total para paginación
        const totalResult = await obtenerUno(`SELECT COUNT(*) as total FROM transacciones t ${whereClause}`);
        const total = totalResult ? totalResult.total : 0;
        
        adminData.transactions = {
            data: transactions || [],
            total: total,
            page: page,
            limit: limit,
            pages: Math.ceil(total / limit)
        };
        
        return adminData.transactions;
        
    } catch (error) {
        console.error('Error al cargar transacciones:', error);
        return { data: [], total: 0, page: 1, limit: 20, pages: 0 };
    }
}

// Cargar configuración del sistema
async function loadAdminConfig() {
    try {
        const config = await obtenerUno("SELECT * FROM system_config WHERE id = 1");
        
        if (config) {
            adminData.config = config;
            return config;
        }
        
        return null;
        
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        return null;
    }
}

// Guardar configuración del sistema
async function saveAdminConfig(configData) {
    try {
        const result = await ejecutarComando(`
            UPDATE system_config 
            SET precio_ticket = ${configData.precio_ticket}, 
                puntos_por_dolar = ${configData.puntos_por_dolar}, 
                rifa_activa = ${configData.rifa_activa ? 1 : 0},
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = 1
        `);
        
        if (result.success) {
            adminData.config = configData;
            return { success: true, message: 'Configuración guardada exitosamente' };
        } else {
            throw new Error('Error al guardar configuración');
        }
        
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        return { success: false, message: 'Error al guardar configuración' };
    }
}

// Crear nuevo usuario desde admin
async function createAdminUser(userData) {
    try {
        // Verificar si el usuario ya existe
        const existingUser = await obtenerUno(
            `SELECT id FROM users WHERE telefono = '${userData.telefono}' OR cedula = '${userData.cedula}'`
        );
        
        if (existingUser) {
            return { success: false, message: 'El teléfono o cédula ya están registrados' };
        }
        
        // Hash de contraseña (en producción usar bcrypt)
        const passwordHash = `$2a$10$${btoa(userData.password).substring(0, 50)}...`;
        
        // Insertar nuevo usuario
        const result = await ejecutarComando(`
            INSERT INTO users (nombre, telefono, cedula, correo, password_hash, puntos, role)
            VALUES (
                '${userData.nombre}',
                '${userData.telefono}',
                '${userData.cedula}',
                '${userData.correo}',
                '${passwordHash}',
                ${userData.puntos || 0},
                '${userData.role || 'user'}'
            )
        `);
        
        if (result.success) {
            return { success: true, message: 'Usuario creado exitosamente' };
        } else {
            throw new Error('Error al crear usuario');
        }
        
    } catch (error) {
        console.error('Error al crear usuario:', error);
        return { success: false, message: 'Error al crear usuario' };
    }
}

// Actualizar usuario desde admin
async function updateAdminUser(userId, userData) {
    try {
        let updateFields = [];
        
        if (userData.nombre) updateFields.push(`nombre = '${userData.nombre}'`);
        if (userData.telefono) updateFields.push(`telefono = '${userData.telefono}'`);
        if (userData.cedula) updateFields.push(`cedula = '${userData.cedula}'`);
        if (userData.correo) updateFields.push(`correo = '${userData.correo}'`);
        if (userData.puntos !== undefined) updateFields.push(`puntos = ${userData.puntos}`);
        if (userData.role) updateFields.push(`role = '${userData.role}'`);
        
        if (userData.password) {
            const passwordHash = `$2a$10$${btoa(userData.password).substring(0, 50)}...`;
            updateFields.push(`password_hash = '${passwordHash}'`);
        }
        
        if (updateFields.length === 0) {
            return { success: false, message: 'No hay campos para actualizar' };
        }
        
        const result = await ejecutarComando(`
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = ${userId}
        `);
        
        if (result.success) {
            return { success: true, message: 'Usuario actualizado exitosamente' };
        } else {
            throw new Error('Error al actualizar usuario');
        }
        
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        return { success: false, message: 'Error al actualizar usuario' };
    }
}

// Eliminar usuario desde admin
async function deleteAdminUser(userId) {
    try {
        // Verificar que no sea el último admin
        const user = await obtenerUno(`SELECT role FROM users WHERE id = ${userId}`);
        if (user && user.role === 'admin') {
            const adminCount = await obtenerUno(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
            if (adminCount && adminCount.count <= 1) {
                return { success: false, message: 'No se puede eliminar el único administrador' };
            }
        }
        
        const result = await ejecutarComando(`DELETE FROM users WHERE id = ${userId}`);
        
        if (result.success) {
            return { success: true, message: 'Usuario eliminado exitosamente' };
        } else {
            throw new Error('Error al eliminar usuario');
        }
        
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return { success: false, message: 'Error al eliminar usuario' };
    }
}

// Generar reporte de ventas
async function generateSalesReport(startDate, endDate) {
    try {
        const report = await obtenerDatos(`
            SELECT 
                DATE(t.fecha_compra) as fecha,
                COUNT(*) as tickets_vendidos,
                COUNT(DISTINCT t.user_id) as usuarios_unicos,
                SUM(tr.puntos) as puntos_totales,
                (SUM(tr.puntos) / (SELECT puntos_por_dolar FROM system_config WHERE id = 1)) as ingresos_estimados
            FROM tickets t
            LEFT JOIN transacciones tr ON tr.user_id = t.user_id AND tr.tipo = 'compra' AND DATE(tr.fecha) = DATE(t.fecha_compra)
            WHERE t.estado = 'vendido'
            AND DATE(t.fecha_compra) BETWEEN '${startDate}' AND '${endDate}'
            GROUP BY DATE(t.fecha_compra)
            ORDER BY fecha
        `);
        
        return {
            success: true,
            data: report || [],
            summary: {
                total_tickets: report.reduce((sum, item) => sum + (item.tickets_vendidos || 0), 0),
                total_users: report.reduce((sum, item) => sum + (item.usuarios_unicos || 0), 0),
                total_points: report.reduce((sum, item) => sum + (item.puntos_totales || 0), 0),
                total_revenue: report.reduce((sum, item) => sum + (item.ingresos_estimados || 0), 0)
            }
        };
        
    } catch (error) {
        console.error('Error al generar reporte:', error);
        return { success: false, data: [], summary: {} };
    }
}

// Generar reporte de usuarios
async function generateUsersReport() {
    try {
        const report = await obtenerDatos(`
            SELECT 
                role,
                COUNT(*) as cantidad,
                AVG(puntos) as puntos_promedio,
                MAX(puntos) as puntos_maximos,
                MIN(puntos) as puntos_minimos,
                SUM(puntos) as puntos_totales
            FROM users
            GROUP BY role
        `);
        
        return {
            success: true,
            data: report || [],
            total_users: report.reduce((sum, item) => sum + (item.cantidad || 0), 0)
        };
        
    } catch (error) {
        console.error('Error al generar reporte de usuarios:', error);
        return { success: false, data: [], total_users: 0 };
    }
}

// Inicializar gráficos administrativos
function initAdminCharts() {
    // Esta función inicializaría los gráficos Chart.js
    // Se implementaría según los datos disponibles
}

// Exportar datos a diferentes formatos
async function exportAdminData(format, dataType, filters = {}) {
    try {
        let data = [];
        
        switch(dataType) {
            case 'users':
                data = (await loadAdminUsers('', 1, 1000)).data;
                break;
            case 'recharges':
                data = (await loadAdminRecharges(filters.status || 'all', 1, 1000)).data;
                break;
            case 'transactions':
                data = (await loadAdminTransactions(filters.startDate, filters.endDate, 1, 1000)).data;
                break;
            case 'sales':
                data = (await generateSalesReport(filters.startDate, filters.endDate)).data;
                break;
        }
        
        if (format === 'csv') {
            return exportToCSV(data, dataType);
        } else if (format === 'json') {
            return exportToJSON(data, dataType);
        } else if (format === 'excel') {
            return exportToExcel(data, dataType);
        }
        
        return { success: false, message: 'Formato no soportado' };
        
    } catch (error) {
        console.error('Error al exportar datos:', error);
        return { success: false, message: 'Error al exportar datos' };
    }
}

// Función auxiliar para exportar a CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        return '';
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    return { success: true, message: 'CSV exportado exitosamente' };
}

// Función auxiliar para exportar a JSON
function exportToJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    return { success: true, message: 'JSON exportado exitosamente' };
}

// Función auxiliar para exportar a Excel (simplificada)
function exportToExcel(data, filename) {
    // En un sistema real, usarías una biblioteca como SheetJS
    // Esta es una implementación simplificada que usa CSV
    return exportToCSV(data, filename);
}

// Reiniciar sistema (operación peligrosa)
async function resetSystem(confirm = false) {
    if (!confirm) {
        return { 
            success: false, 
            message: 'Se requiere confirmación para esta operación' 
        };
    }
    
    try {
        // Esta operación es peligrosa y debería tener múltiples confirmaciones
        // En producción, considerar hacer backup primero
        
        const queries = [
            "DELETE FROM transacciones",
            "DELETE FROM transferencias",
            "DELETE FROM recargas",
            "UPDATE tickets SET estado = 'disponible', user_id = NULL, fecha_reserva = NULL, fecha_compra = NULL",
            "UPDATE users SET puntos = 0 WHERE role = 'user'",
            "UPDATE users SET puntos = 1000 WHERE role = 'admin'"
        ];
        
        for (const query of queries) {
            await ejecutarComando(query);
        }
        
        return { 
            success: true, 
            message: 'Sistema reiniciado exitosamente (excepto usuarios)' 
        };
        
    } catch (error) {
        console.error('Error al reiniciar sistema:', error);
        return { success: false, message: 'Error al reiniciar sistema' };
    }
}

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initAdminPanel,
        loadAdminStats,
        loadAdminUsers,
        loadAdminRecharges,
        approveRecharge,
        rejectRecharge,
        loadAdminTransactions,
        loadAdminConfig,
        saveAdminConfig,
        createAdminUser,
        updateAdminUser,
        deleteAdminUser,
        generateSalesReport,
        generateUsersReport,
        exportAdminData,
        resetSystem
    };
}