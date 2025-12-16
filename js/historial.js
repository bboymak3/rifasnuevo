// historial.js - Funciones específicas para manejo de historial

// Variables globales
let historialData = {
    transacciones: [],
    tickets: [],
    recargas: [],
    transferencias: []
};

// Inicializar sistema de historial
async function initHistorialSystem() {
    try {
        // Cargar estadísticas iniciales
        await loadHistorialStats();
        
        // Cargar transacciones recientes
        await loadRecentTransactions();
        
        return true;
    } catch (error) {
        console.error('Error al inicializar sistema de historial:', error);
        return false;
    }
}

// Cargar estadísticas del historial
async function loadHistorialStats() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        const stats = await obtenerDatos(`
            SELECT 
                (SELECT COUNT(*) FROM transacciones WHERE user_id = ${usuario.id}) as total_transacciones,
                (SELECT ABS(SUM(puntos)) FROM transacciones WHERE user_id = ${usuario.id} AND puntos < 0) as puntos_gastados,
                (SELECT SUM(puntos) FROM transacciones WHERE user_id = ${usuario.id} AND puntos > 0) as puntos_recibidos,
                (SELECT COUNT(*) FROM tickets WHERE user_id = ${usuario.id} AND estado = 'vendido') as tickets_comprados,
                (SELECT SUM(monto) FROM recargas WHERE user_id = ${usuario.id} AND estado = 'aprobado') as total_recargas,
                (SELECT COUNT(*) FROM transferencias WHERE from_user_id = ${usuario.id} OR to_user_id = ${usuario.id}) as total_transferencias
        `);
        
        if (stats && stats.length > 0) {
            return stats[0];
        }
        
        return {};
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        return {};
    }
}

// Cargar transacciones recientes
async function loadRecentTransactions(limit = 10) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        const transacciones = await obtenerDatos(`
            SELECT * FROM transacciones 
            WHERE user_id = ${usuario.id}
            ORDER BY fecha DESC
            LIMIT ${limit}
        `);
        
        historialData.transacciones = transacciones || [];
        return historialData.transacciones;
        
    } catch (error) {
        console.error('Error al cargar transacciones:', error);
        return [];
    }
}

// Cargar transacciones con filtros
async function loadFilteredTransactions(filters = {}) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        let whereClause = `WHERE user_id = ${usuario.id}`;
        
        if (filters.tipo && filters.tipo !== 'all') {
            whereClause += ` AND tipo = '${filters.tipo}'`;
        }
        
        if (filters.fechaInicio && filters.fechaFin) {
            whereClause += ` AND DATE(fecha) BETWEEN '${filters.fechaInicio}' AND '${filters.fechaFin}'`;
        }
        
        if (filters.busqueda) {
            whereClause += ` AND (descripcion LIKE '%${filters.busqueda}%' OR tipo LIKE '%${filters.busqueda}%')`;
        }
        
        const transacciones = await obtenerDatos(`
            SELECT * FROM transacciones
            ${whereClause}
            ORDER BY fecha DESC
            LIMIT ${filters.limit || 50} OFFSET ${filters.offset || 0}
        `);
        
        // Obtener total para paginación
        const totalResult = await obtenerUno(
            `SELECT COUNT(*) as total FROM transacciones ${whereClause}`
        );
        const total = totalResult ? totalResult.total : 0;
        
        return {
            data: transacciones || [],
            total: total,
            page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
            pages: Math.ceil(total / (filters.limit || 50))
        };
        
    } catch (error) {
        console.error('Error al cargar transacciones filtradas:', error);
        return { data: [], total: 0, page: 1, pages: 0 };
    }
}

// Cargar tickets del usuario
async function loadUserTickets(filters = {}) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        let whereClause = `WHERE user_id = ${usuario.id}`;
        
        if (filters.estado && filters.estado !== 'all') {
            whereClause += ` AND estado = '${filters.estado}'`;
        }
        
        const tickets = await obtenerDatos(`
            SELECT numero, estado, fecha_compra, fecha_reserva 
            FROM tickets
            ${whereClause}
            ORDER BY fecha_compra DESC
            LIMIT ${filters.limit || 50} OFFSET ${filters.offset || 0}
        `);
        
        const totalResult = await obtenerUno(
            `SELECT COUNT(*) as total FROM tickets ${whereClause}`
        );
        const total = totalResult ? totalResult.total : 0;
        
        historialData.tickets = tickets || [];
        
        return {
            data: historialData.tickets,
            total: total,
            page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
            pages: Math.ceil(total / (filters.limit || 50))
        };
        
    } catch (error) {
        console.error('Error al cargar tickets:', error);
        return { data: [], total: 0, page: 1, pages: 0 };
    }
}

// Cargar recargas del usuario
async function loadUserRecharges(filters = {}) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        let whereClause = `WHERE user_id = ${usuario.id}`;
        
        if (filters.estado && filters.estado !== 'all') {
            whereClause += ` AND estado = '${filters.estado}'`;
        }
        
        if (filters.fechaInicio && filters.fechaFin) {
            whereClause += ` AND DATE(fecha_solicitud) BETWEEN '${filters.fechaInicio}' AND '${filters.fechaFin}'`;
        }
        
        const recargas = await obtenerDatos(`
            SELECT id, monto, puntos_solicitados, puntos_otorgados, 
                   metodo, estado, fecha_solicitud, fecha_resolucion, 
                   mensaje_admin, referencia
            FROM recargas
            ${whereClause}
            ORDER BY fecha_solicitud DESC
            LIMIT ${filters.limit || 50} OFFSET ${filters.offset || 0}
        `);
        
        const totalResult = await obtenerUno(
            `SELECT COUNT(*) as total FROM recargas ${whereClause}`
        );
        const total = totalResult ? totalResult.total : 0;
        
        historialData.recargas = recargas || [];
        
        return {
            data: historialData.recargas,
            total: total,
            page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
            pages: Math.ceil(total / (filters.limit || 50))
        };
        
    } catch (error) {
        console.error('Error al cargar recargas:', error);
        return { data: [], total: 0, page: 1, pages: 0 };
    }
}

// Cargar transferencias del usuario
async function loadUserTransfers(filters = {}) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        const transferencias = await obtenerDatos(`
            SELECT t.*, 
                   u1.nombre as from_user_name,
                   u2.nombre as to_user_name
            FROM transferencias t
            JOIN users u1 ON t.from_user_id = u1.id
            JOIN users u2 ON t.to_user_id = u2.id
            WHERE t.from_user_id = ${usuario.id} OR t.to_user_id = ${usuario.id}
            ORDER BY t.fecha DESC
            LIMIT ${filters.limit || 50} OFFSET ${filters.offset || 0}
        `);
        
        const totalResult = await obtenerUno(`
            SELECT COUNT(*) as total FROM transferencias 
            WHERE from_user_id = ${usuario.id} OR to_user_id = ${usuario.id}
        `);
        const total = totalResult ? totalResult.total : 0;
        
        historialData.transferencias = transferencias || [];
        
        return {
            data: historialData.transferencias,
            total: total,
            page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
            pages: Math.ceil(total / (filters.limit || 50))
        };
        
    } catch (error) {
        console.error('Error al cargar transferencias:', error);
        return { data: [], total: 0, page: 1, pages: 0 };
    }
}

// Obtener detalles de una transacción
async function getTransactionDetails(transactionId) {
    try {
        const transaccion = await obtenerUno(
            `SELECT * FROM transacciones WHERE id = ${transactionId}`
        );
        
        if (transaccion) {
            return {
                success: true,
                data: transaccion
            };
        }
        
        return {
            success: false,
            message: 'Transacción no encontrada'
        };
        
    } catch (error) {
        console.error('Error al obtener detalles:', error);
        return {
            success: false,
            message: 'Error al obtener detalles'
        };
    }
}

// Obtener detalles de un ticket
async function getTicketDetails(ticketNumber) {
    try {
        const ticket = await obtenerUno(`
            SELECT t.*, u.nombre as user_name, u.telefono
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.numero = ${ticketNumber}
        `);
        
        if (ticket) {
            return {
                success: true,
                data: ticket
            };
        }
        
        return {
            success: false,
            message: 'Ticket no encontrado'
        };
        
    } catch (error) {
        console.error('Error al obtener detalles del ticket:', error);
        return {
            success: false,
            message: 'Error al obtener detalles'
        };
    }
}

// Obtener detalles de una recarga
async function getRechargeDetails(rechargeId) {
    try {
        const recarga = await obtenerUno(`
            SELECT r.*, u.nombre as user_name
            FROM recargas r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ${rechargeId}
        `);
        
        if (recarga) {
            return {
                success: true,
                data: recarga
            };
        }
        
        return {
            success: false,
            message: 'Recarga no encontrada'
        };
        
    } catch (error) {
        console.error('Error al obtener detalles de recarga:', error);
        return {
            success: false,
            message: 'Error al obtener detalles'
        };
    }
}

// Obtener detalles de una transferencia
async function getTransferDetails(transferId) {
    try {
        const transferencia = await obtenerUno(`
            SELECT t.*, 
                   u1.nombre as from_user_name,
                   u2.nombre as to_user_name
            FROM transferencias t
            JOIN users u1 ON t.from_user_id = u1.id
            JOIN users u2 ON t.to_user_id = u2.id
            WHERE t.id = ${transferId}
        `);
        
        if (transferencia) {
            return {
                success: true,
                data: transferencia
            };
        }
        
        return {
            success: false,
            message: 'Transferencia no encontrada'
        };
        
    } catch (error) {
        console.error('Error al obtener detalles de transferencia:', error);
        return {
            success: false,
            message: 'Error al obtener detalles'
        };
    }
}

// Generar resumen por período
async function generatePeriodSummary(startDate, endDate) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        const summary = await obtenerDatos(`
            SELECT 
                DATE(fecha) as dia,
                COUNT(*) as transacciones,
                SUM(CASE WHEN puntos > 0 THEN puntos ELSE 0 END) as puntos_entrada,
                SUM(CASE WHEN puntos < 0 THEN ABS(puntos) ELSE 0 END) as puntos_salida,
                GROUP_CONCAT(DISTINCT tipo) as tipos
            FROM transacciones
            WHERE user_id = ${usuario.id}
            AND DATE(fecha) BETWEEN '${startDate}' AND '${endDate}'
            GROUP BY DATE(fecha)
            ORDER BY dia DESC
        `);
        
        return {
            success: true,
            data: summary || [],
            total_dias: summary ? summary.length : 0,
            total_transacciones: summary ? summary.reduce((sum, item) => sum + (item.transacciones || 0), 0) : 0,
            total_entrada: summary ? summary.reduce((sum, item) => sum + (item.puntos_entrada || 0), 0) : 0,
            total_salida: summary ? summary.reduce((sum, item) => sum + (item.puntos_salida || 0), 0) : 0
        };
        
    } catch (error) {
        console.error('Error al generar resumen:', error);
        return {
            success: false,
            data: [],
            total_dias: 0,
            total_transacciones: 0,
            total_entrada: 0,
            total_salida: 0
        };
    }
}

// Exportar historial a CSV
function exportHistorialToCSV(data, tipo, filename) {
    if (!data || data.length === 0) {
        return { success: false, message: 'No hay datos para exportar' };
    }
    
    try {
        // Determinar encabezados según el tipo
        let headers = [];
        switch(tipo) {
            case 'transacciones':
                headers = ['Fecha', 'Tipo', 'Descripción', 'Puntos', 'Referencia'];
                break;
            case 'tickets':
                headers = ['Número', 'Estado', 'Fecha Compra', 'Fecha Reserva'];
                break;
            case 'recargas':
                headers = ['Fecha', 'Monto', 'Puntos', 'Método', 'Estado', 'Referencia'];
                break;
            case 'transferencias':
                headers = ['Fecha', 'De', 'Para', 'Puntos', 'Estado'];
                break;
            default:
                headers = Object.keys(data[0]);
        }
        
        // Crear filas CSV
        const csvRows = [
            headers.join(','),
            ...data.map(row => {
                switch(tipo) {
                    case 'transacciones':
                        return [
                            new Date(row.fecha).toLocaleDateString(),
                            row.tipo,
                            `"${(row.descripcion || '').replace(/"/g, '""')}"`,
                            row.puntos,
                            row.referencia_id || ''
                        ].join(',');
                        
                    case 'tickets':
                        return [
                            row.numero,
                            row.estado,
                            row.fecha_compra ? new Date(row.fecha_compra).toLocaleDateString() : '',
                            row.fecha_reserva ? new Date(row.fecha_reserva).toLocaleDateString() : ''
                        ].join(',');
                        
                    case 'recargas':
                        return [
                            new Date(row.fecha_solicitud).toLocaleDateString(),
                            row.monto,
                            row.puntos_solicitados,
                            row.metodo,
                            row.estado,
                            row.referencia || ''
                        ].join(',');
                        
                    case 'transferencias':
                        return [
                            new Date(row.fecha).toLocaleDateString(),
                            row.from_user_name,
                            row.to_user_name,
                            row.puntos,
                            row.estado
                        ].join(',');
                        
                    default:
                        return headers.map(header => 
                            JSON.stringify(row[header] || '')
                        ).join(',');
                }
            })
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename || 'historial'}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return { success: true, message: 'CSV exportado exitosamente' };
        
    } catch (error) {
        console.error('Error al exportar a CSV:', error);
        return { success: false, message: 'Error al exportar a CSV' };
    }
}

// Exportar historial a JSON
function exportHistorialToJSON(data, filename) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename || 'historial'}_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return { success: true, message: 'JSON exportado exitosamente' };
        
    } catch (error) {
        console.error('Error al exportar a JSON:', error);
        return { success: false, message: 'Error al exportar a JSON' };
    }
}

// Renderizar tabla de transacciones
function renderTransactionsTable(containerId, transactions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-exchange-alt"></i>
                    <p>No hay transacciones para mostrar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    transactions.forEach(trans => {
        const fecha = new Date(trans.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let tipoClase = '';
        let tipoIcon = '';
        switch(trans.tipo) {
            case 'compra':
                tipoClase = 'type-compra';
                tipoIcon = '🛒';
                break;
            case 'recarga':
                tipoClase = 'type-recarga';
                tipoIcon = '💰';
                break;
            case 'transferencia_salida':
            case 'transferencia_entrada':
                tipoClase = 'type-transferencia';
                tipoIcon = '🔄';
                break;
            case 'reembolso':
                tipoClase = 'type-reembolso';
                tipoIcon = '↩️';
                break;
        }
        
        const puntosClase = trans.puntos >= 0 ? 'points-positive' : 'points-negative';
        const puntosSigno = trans.puntos > 0 ? '+' : '';
        
        html += `
            <tr>
                <td>${fecha}</td>
                <td>
                    <span class="transaction-type ${tipoClase}">
                        ${tipoIcon} ${trans.tipo}
                    </span>
                </td>
                <td>${trans.descripcion || 'Sin descripción'}</td>
                <td class="points-change ${puntosClase}">
                    ${puntosSigno}${trans.puntos} pts
                </td>
                <td>
                    <button class="btn-small" onclick="viewTransactionDetails(${trans.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

// Renderizar paginación
function renderPagination(containerId, totalItems, currentPage, itemsPerPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botón anterior
    if (currentPage > 1) {
        html += `<button class="page-btn" onclick="${onPageChange}(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                 </button>`;
    }
    
    // Páginas
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                         onclick="${onPageChange}(${i})">
                    ${i}
                 </button>`;
    }
    
    // Botón siguiente
    if (currentPage < totalPages) {
        html += `<button class="page-btn" onclick="${onPageChange}(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                 </button>`;
    }
    
    container.innerHTML = html;
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-circle' : 
                          type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initHistorialSystem,
        loadHistorialStats,
        loadRecentTransactions,
        loadFilteredTransactions,
        loadUserTickets,
        loadUserRecharges,
        loadUserTransfers,
        getTransactionDetails,
        getTicketDetails,
        getRechargeDetails,
        getTransferDetails,
        generatePeriodSummary,
        exportHistorialToCSV,
        exportHistorialToJSON,
        renderTransactionsTable,
        renderPagination,
        showNotification
    };
}