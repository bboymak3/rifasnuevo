// transferencias.js - Funciones específicas para manejo de transferencias

// Variables globales
let transferenciaActual = {
    destinatarioId: null,
    destinatarioNombre: '',
    destinatarioTelefono: '',
    monto: 0,
    mensaje: ''
};

let saldoUsuario = 0;
let historialTransferencias = [];

// Inicializar sistema de transferencias
async function initTransferenciasSystem() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        if (!usuario) {
            throw new Error('Usuario no autenticado');
        }
        
        saldoUsuario = usuario.puntos;
        
        // Cargar historial de transferencias
        await cargarHistorialTransferencias();
        
        return true;
        
    } catch (error) {
        console.error('Error al inicializar sistema de transferencias:', error);
        return false;
    }
}

// Buscar usuarios para transferencia
async function buscarUsuariosTransferencia(terminoBusqueda) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        if (terminoBusqueda.length < 3) {
            return [];
        }
        
        const usuarios = await obtenerDatos(`
            SELECT id, nombre, telefono, cedula, puntos
            FROM users
            WHERE (telefono LIKE '%${terminoBusqueda}%' 
                   OR nombre LIKE '%${terminoBusqueda}%'
                   OR cedula LIKE '%${terminoBusqueda}%')
            AND id != ${usuario.id}
            AND role != 'admin'
            LIMIT 10
        `);
        
        return usuarios || [];
        
    } catch (error) {
        console.error('Error al buscar usuarios:', error);
        return [];
    }
}

// Seleccionar destinatario
function seleccionarDestinatario(usuario) {
    transferenciaActual.destinatarioId = usuario.id;
    transferenciaActual.destinatarioNombre = usuario.nombre;
    transferenciaActual.destinatarioTelefono = usuario.telefono;
    
    return transferenciaActual;
}

// Validar monto de transferencia
function validarMontoTransferencia(monto) {
    if (monto <= 0) {
        return { valido: false, mensaje: 'El monto debe ser mayor a 0' };
    }
    
    if (monto > saldoUsuario) {
        return { valido: false, mensaje: 'No tienes puntos suficientes' };
    }
    
    // Límite máximo de transferencia (opcional)
    const limiteMaximo = 10000;
    if (monto > limiteMaximo) {
        return { valido: false, mensaje: `El límite máximo es ${limiteMaximo} puntos` };
    }
    
    return { valido: true, mensaje: '' };
}

// Procesar transferencia
async function procesarTransferencia() {
    const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
    
    // Validar datos
    if (!transferenciaActual.destinatarioId) {
        return { 
            success: false, 
            message: 'Selecciona un destinatario' 
        };
    }
    
    const validacion = validarMontoTransferencia(transferenciaActual.monto);
    if (!validacion.valido) {
        return { 
            success: false, 
            message: validacion.mensaje 
        };
    }
    
    try {
        // Verificar que el destinatario exista
        const destinatario = await obtenerUno(
            `SELECT id, nombre FROM users WHERE id = ${transferenciaActual.destinatarioId}`
        );
        
        if (!destinatario) {
            return { 
                success: false, 
                message: 'El destinatario ya no existe' 
            };
        }
        
        // Ejecutar transferencia en transacción
        const queries = [
            // Restar puntos del remitente
            `UPDATE users SET puntos = puntos - ${transferenciaActual.monto} WHERE id = ${usuario.id}`,
            
            // Sumar puntos al destinatario
            `UPDATE users SET puntos = puntos + ${transferenciaActual.monto} WHERE id = ${transferenciaActual.destinatarioId}`,
            
            // Registrar transferencia
            `INSERT INTO transferencias (from_user_id, to_user_id, puntos, mensaje, estado, fecha)
             VALUES (${usuario.id}, ${transferenciaActual.destinatarioId}, 
                    ${transferenciaActual.monto}, 
                    '${transferenciaActual.mensaje || 'Transferencia de puntos'}', 
                    'completada', CURRENT_TIMESTAMP)`,
            
            // Registrar transacción del remitente
            `INSERT INTO transacciones (user_id, tipo, puntos, descripcion, fecha)
             VALUES (${usuario.id}, 'transferencia_salida', 
                    -${transferenciaActual.monto}, 
                    'Transferencia a ${destinatario.nombre}',
                    CURRENT_TIMESTAMP)`,
            
            // Registrar transacción del destinatario
            `INSERT INTO transacciones (user_id, tipo, puntos, descripcion, fecha)
             VALUES (${transferenciaActual.destinatarioId}, 
                    'transferencia_entrada', 
                    ${transferenciaActual.monto}, 
                    'Transferencia de ${usuario.nombre}',
                    CURRENT_TIMESTAMP)`
        ];
        
        // Ejecutar todas las queries
        for (const query of queries) {
            const resultado = await ejecutarComando(query);
            if (!resultado.success) {
                throw new Error(`Error en query: ${query}`);
            }
        }
        
        // Actualizar datos locales
        usuario.puntos -= transferenciaActual.monto;
        localStorage.setItem('usuarioRifa', JSON.stringify(usuario));
        saldoUsuario = usuario.puntos;
        
        // Actualizar historial
        await cargarHistorialTransferencias();
        
        // Registrar en historial local
        historialTransferencias.unshift({
            id: Date.now(),
            from_user_id: usuario.id,
            from_user_name: usuario.nombre,
            to_user_id: transferenciaActual.destinatarioId,
            to_user_name: transferenciaActual.destinatarioNombre,
            puntos: transferenciaActual.monto,
            mensaje: transferenciaActual.mensaje,
            estado: 'completada',
            fecha: new Date().toISOString()
        });
        
        return {
            success: true,
            message: 'Transferencia completada exitosamente',
            data: {
                monto: transferenciaActual.monto,
                destinatario: transferenciaActual.destinatarioNombre,
                nuevoSaldo: usuario.puntos,
                referencia: historialTransferencias[0].id
            }
        };
        
    } catch (error) {
        console.error('Error al procesar transferencia:', error);
        return {
            success: false,
            message: 'Error al procesar la transferencia'
        };
    }
}

// Cargar historial de transferencias
async function cargarHistorialTransferencias(limit = 10) {
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
            LIMIT ${limit}
        `);
        
        historialTransferencias = transferencias || [];
        return historialTransferencias;
        
    } catch (error) {
        console.error('Error al cargar historial de transferencias:', error);
        return [];
    }
}

// Obtener estadísticas de transferencias
async function obtenerEstadisticasTransferencias() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        const estadisticas = await obtenerDatos(`
            SELECT 
                (SELECT COUNT(*) FROM transferencias WHERE from_user_id = ${usuario.id}) as enviadas,
                (SELECT COUNT(*) FROM transferencias WHERE to_user_id = ${usuario.id}) as recibidas,
                (SELECT SUM(puntos) FROM transferencias WHERE from_user_id = ${usuario.id}) as puntos_enviados,
                (SELECT SUM(puntos) FROM transferencias WHERE to_user_id = ${usuario.id}) as puntos_recibidos,
                (SELECT COUNT(DISTINCT to_user_id) FROM transferencias WHERE from_user_id = ${usuario.id}) as destinatarios_unicos
        `);
        
        if (estadisticas && estadisticas.length > 0) {
            return estadisticas[0];
        }
        
        return {
            enviadas: 0,
            recibidas: 0,
            puntos_enviados: 0,
            puntos_recibidos: 0,
            destinatarios_unicos: 0
        };
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {
            enviadas: 0,
            recibidas: 0,
            puntos_enviados: 0,
            puntos_recibidos: 0,
            destinatarios_unicos: 0
        };
    }
}

// Renderizar lista de usuarios en búsqueda
function renderizarResultadosBusqueda(usuarios, containerId, onSelectCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!usuarios || usuarios.length === 0) {
        container.innerHTML = `
            <div class="empty-result">
                <i class="fas fa-user-slash"></i>
                <p>No se encontraron usuarios</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    let html = '';
    usuarios.forEach(usuario => {
        html += `
            <div class="user-result" onclick="${onSelectCallback}(${usuario.id}, '${usuario.nombre}', '${usuario.telefono}')">
                <div class="user-avatar-small">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-info-small">
                    <div class="user-name-small">${usuario.nombre}</div>
                    <div class="user-details-small">
                        📞 ${usuario.telefono} | 🎫 ${usuario.puntos} puntos
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Renderizar historial de transferencias
function renderizarHistorialTransferencias(transferencias, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!transferencias || transferencias.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-exchange-alt"></i>
                    <p>No hay transferencias para mostrar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
    let html = '';
    
    transferencias.forEach(transferencia => {
        const fecha = new Date(transferencia.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const esRemitente = transferencia.from_user_id === usuario.id;
        const otroUsuario = esRemitente ? transferencia.to_user_name : transferencia.from_user_name;
        const direccion = esRemitente ? '→' : '←';
        const claseMonto = esRemitente ? 'negative' : 'positive';
        const signoMonto = esRemitente ? '-' : '+';
        
        let estadoClase = '';
        switch(transferencia.estado) {
            case 'completada':
                estadoClase = 'status-completed';
                break;
            case 'pendiente':
                estadoClase = 'status-pending';
                break;
            case 'fallida':
                estadoClase = 'status-failed';
                break;
        }
        
        html += `
            <tr>
                <td>${fecha}</td>
                <td>${direccion} ${otroUsuario}</td>
                <td class="${claseMonto}">
                    ${signoMonto}${transferencia.puntos}
                </td>
                <td>
                    <span class="transfer-status ${estadoClase}">
                        ${transferencia.estado}
                    </span>
                </td>
                <td>${transferencia.mensaje || '-'}</td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

// Limpiar datos de transferencia
function limpiarDatosTransferencia() {
    transferenciaActual = {
        destinatarioId: null,
        destinatarioNombre: '',
        destinatarioTelefono: '',
        monto: 0,
        mensaje: ''
    };
    
    // Actualizar UI si es necesario
    const elementos = ['searchInput', 'amountInput', 'messageInput'];
    elementos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (elemento.type === 'checkbox') {
                elemento.checked = false;
            } else {
                elemento.value = '';
            }
        }
    });
    
    // Ocultar resultados de búsqueda
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
    
    // Ocultar usuario seleccionado
    const selectedContainer = document.getElementById('selectedUserContainer');
    if (selectedContainer) {
        selectedContainer.style.display = 'none';
    }
}

// Verificar límites de transferencia
async function verificarLimitesTransferencia() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        const hoy = new Date().toISOString().split('T')[0];
        
        const limites = await obtenerDatos(`
            SELECT 
                (SELECT COUNT(*) FROM transferencias 
                 WHERE from_user_id = ${usuario.id} 
                 AND DATE(fecha) = '${hoy}') as transferencias_hoy,
                (SELECT SUM(puntos) FROM transferencias 
                 WHERE from_user_id = ${usuario.id} 
                 AND DATE(fecha) = '${hoy}') as puntos_hoy
        `);
        
        if (limites && limites.length > 0) {
            const data = limites[0];
            
            // Límites configurados (podrían venir de la base de datos)
            const MAX_TRANSFERENCIAS_DIARIAS = 10;
            const MAX_PUNTOS_DIARIOS = 5000;
            
            return {
                transferencias_hoy: data.transferencias_hoy || 0,
                puntos_hoy: data.puntos_hoy || 0,
                max_transferencias: MAX_TRANSFERENCIAS_DIARIAS,
                max_puntos: MAX_PUNTOS_DIARIOS,
                puede_transferir: (data.transferencias_hoy || 0) < MAX_TRANSFERENCIAS_DIARIAS
            };
        }
        
        return {
            transferencias_hoy: 0,
            puntos_hoy: 0,
            max_transferencias: 10,
            max_puntos: 5000,
            puede_transferir: true
        };
        
    } catch (error) {
        console.error('Error al verificar límites:', error);
        return {
            transferencias_hoy: 0,
            puntos_hoy: 0,
            max_transferencias: 10,
            max_puntos: 5000,
            puede_transferir: true
        };
    }
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : 
                          tipo === 'error' ? 'exclamation-circle' : 
                          tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initTransferenciasSystem,
        buscarUsuariosTransferencia,
        seleccionarDestinatario,
        validarMontoTransferencia,
        procesarTransferencia,
        cargarHistorialTransferencias,
        obtenerEstadisticasTransferencias,
        renderizarResultadosBusqueda,
        renderizarHistorialTransferencias,
        limpiarDatosTransferencia,
        verificarLimitesTransferencia,
        mostrarNotificacion
    };
}