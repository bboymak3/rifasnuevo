// perfil.js - Funciones específicas para manejo de perfil de usuario

// Variables globales
let datosPerfil = {};
let cambiosPendientes = {};
let cambiarPassword = false;

// Inicializar sistema de perfil
async function initPerfilSystem() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        if (!usuario) {
            throw new Error('Usuario no autenticado');
        }
        
        // Cargar datos completos del usuario
        await cargarDatosPerfil(usuario.id);
        
        // Cargar estadísticas del usuario
        await cargarEstadisticasUsuario(usuario.id);
        
        return true;
        
    } catch (error) {
        console.error('Error al inicializar sistema de perfil:', error);
        return false;
    }
}

// Cargar datos del perfil
async function cargarDatosPerfil(userId) {
    try {
        const usuario = await obtenerUno(`
            SELECT id, nombre, telefono, cedula, correo, puntos, role, created_at
            FROM users
            WHERE id = ${userId}
        `);
        
        if (usuario) {
            datosPerfil = usuario;
            return usuario;
        }
        
        return null;
        
    } catch (error) {
        console.error('Error al cargar datos del perfil:', error);
        return null;
    }
}

// Cargar estadísticas del usuario
async function cargarEstadisticasUsuario(userId) {
    try {
        const estadisticas = await obtenerDatos(`
            SELECT 
                (SELECT COUNT(*) FROM tickets WHERE user_id = ${userId} AND estado = 'vendido') as tickets_comprados,
                (SELECT COUNT(*) FROM tickets WHERE user_id = ${userId} AND estado = 'reservado') as tickets_reservados,
                (SELECT COUNT(*) FROM transacciones WHERE user_id = ${userId} AND tipo = 'compra') as compras_realizadas,
                (SELECT COUNT(*) FROM recargas WHERE user_id = ${userId} AND estado = 'aprobado') as recargas_aprobadas,
                (SELECT COUNT(*) FROM transferencias WHERE from_user_id = ${userId}) as transferencias_enviadas,
                (SELECT COUNT(*) FROM transferencias WHERE to_user_id = ${userId}) as transferencias_recibidas,
                (SELECT SUM(monto) FROM recargas WHERE user_id = ${userId} AND estado = 'aprobado') as total_recargado,
                (SELECT MIN(fecha) FROM transacciones WHERE user_id = ${userId}) as fecha_primer_transaccion
        `);
        
        if (estadisticas && estadisticas.length > 0) {
            return estadisticas[0];
        }
        
        return {
            tickets_comprados: 0,
            tickets_reservados: 0,
            compras_realizadas: 0,
            recargas_aprobadas: 0,
            transferencias_enviadas: 0,
            transferencias_recibidas: 0,
            total_recargado: 0,
            fecha_primer_transaccion: null
        };
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        return {
            tickets_comprados: 0,
            tickets_reservados: 0,
            compras_realizadas: 0,
            recargas_aprobadas: 0,
            transferencias_enviadas: 0,
            transferencias_recibidas: 0,
            total_recargado: 0,
            fecha_primer_transaccion: null
        };
    }
}

// Actualizar datos del perfil
async function actualizarPerfil(datosActualizados) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        // Construir campos a actualizar
        const campos = [];
        const valores = [];
        
        if (datosActualizados.nombre && datosActualizados.nombre !== datosPerfil.nombre) {
            campos.push('nombre');
            valores.push(`'${datosActualizados.nombre}'`);
        }
        
        if (datosActualizados.telefono && datosActualizados.telefono !== datosPerfil.telefono) {
            campos.push('telefono');
            valores.push(`'${datosActualizados.telefono}'`);
        }
        
        if (datosActualizados.correo && datosActualizados.correo !== datosPerfil.correo) {
            campos.push('correo');
            valores.push(`'${datosActualizados.correo}'`);
        }
        
        if (datosActualizados.cedula && datosActualizados.cedula !== datosPerfil.cedula) {
            campos.push('cedula');
            valores.push(`'${datosActualizados.cedula}'`);
        }
        
        // Validar que haya campos para actualizar
        if (campos.length === 0) {
            return { 
                success: false, 
                message: 'No hay cambios para actualizar' 
            };
        }
        
        // Construir query de actualización
        const sets = campos.map((campo, index) => `${campo} = ${valores[index]}`);
        const query = `
            UPDATE users 
            SET ${sets.join(', ')}
            WHERE id = ${usuario.id}
        `;
        
        const resultado = await ejecutarComando(query);
        
        if (resultado.success) {
            // Actualizar datos locales
            Object.assign(datosPerfil, datosActualizados);
            usuario.nombre = datosActualizados.nombre || usuario.nombre;
            usuario.telefono = datosActualizados.telefono || usuario.telefono;
            usuario.correo = datosActualizados.correo || usuario.correo;
            usuario.cedula = datosActualizados.cedula || usuario.cedula;
            localStorage.setItem('usuarioRifa', JSON.stringify(usuario));
            
            return { 
                success: true, 
                message: 'Perfil actualizado exitosamente' 
            };
        } else {
            throw new Error('Error al actualizar perfil');
        }
        
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        return { 
            success: false, 
            message: 'Error al actualizar el perfil' 
        };
    }
}

// Cambiar contraseña
async function cambiarContrasena(passwordActual, nuevaPassword, confirmarPassword) {
    try {
        // Validaciones
        if (nuevaPassword !== confirmarPassword) {
            return { 
                success: false, 
                message: 'Las contraseñas no coinciden' 
            };
        }
        
        if (nuevaPassword.length < 6) {
            return { 
                success: false, 
                message: 'La contraseña debe tener al menos 6 caracteres' 
            };
        }
        
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        
        // En un sistema real, aquí verificarías la contraseña actual
        // Simulación: siempre acepta la contraseña actual
        const passwordActualValida = true; // Reemplazar con verificación real
        
        if (!passwordActualValida) {
            return { 
                success: false, 
                message: 'La contraseña actual es incorrecta' 
            };
        }
        
        // Hash de la nueva contraseña (en producción usar bcrypt)
        const nuevaPasswordHash = `$2a$10$${btoa(nuevaPassword).substring(0, 50)}...`;
        
        const resultado = await ejecutarComando(`
            UPDATE users 
            SET password_hash = '${nuevaPasswordHash}'
            WHERE id = ${usuario.id}
        `);
        
        if (resultado.success) {
            return { 
                success: true, 
                message: 'Contraseña cambiada exitosamente' 
            };
        } else {
            throw new Error('Error al cambiar contraseña');
        }
        
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        return { 
            success: false, 
            message: 'Error al cambiar la contraseña' 
        };
    }
}

// Cargar actividad reciente del usuario
async function cargarActividadReciente(userId, limit = 10) {
    try {
        const actividad = await obtenerDatos(`
            SELECT 
                'compra' as tipo,
                '🎫' as icono,
                CONCAT('Compra de tickets') as descripcion,
                fecha_compra as fecha
            FROM tickets
            WHERE user_id = ${userId} AND estado = 'vendido'
            
            UNION ALL
            
            SELECT 
                'recarga' as tipo,
                '💰' as icono,
                CONCAT('Recarga de ', puntos_solicitados, ' puntos') as descripcion,
                fecha_solicitud as fecha
            FROM recargas
            WHERE user_id = ${userId} AND estado = 'aprobado'
            
            UNION ALL
            
            SELECT 
                CASE 
                    WHEN from_user_id = ${userId} THEN 'transferencia_envio'
                    ELSE 'transferencia_recibo'
                END as tipo,
                CASE 
                    WHEN from_user_id = ${userId} THEN '📤'
                    ELSE '📥'
                END as icono,
                CASE 
                    WHEN from_user_id = ${userId} THEN CONCAT('Enviaste ', puntos, ' puntos')
                    ELSE CONCAT('Recibiste ', puntos, ' puntos')
                END as descripcion,
                fecha
            FROM transferencias
            WHERE from_user_id = ${userId} OR to_user_id = ${userId}
            
            ORDER BY fecha DESC
            LIMIT ${limit}
        `);
        
        return actividad || [];
        
    } catch (error) {
        console.error('Error al cargar actividad:', error);
        return [];
    }
}

// Renderizar datos del perfil en formulario
function renderizarDatosPerfil(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!datosPerfil || Object.keys(datosPerfil).length === 0) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando datos del perfil...</p>
            </div>
        `;
        return;
    }
    
    const fechaRegistro = new Date(datosPerfil.created_at).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const esAdmin = datosPerfil.role === 'admin';
    
    container.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">
                <i class="fas fa-user-circle"></i>
                ${esAdmin ? '<span class="admin-badge">👑 Admin</span>' : ''}
            </div>
            <div class="profile-info">
                <h2>${datosPerfil.nombre}</h2>
                <p class="profile-role">${esAdmin ? 'Administrador' : 'Usuario'}</p>
                <p class="profile-date">📅 Miembro desde ${fechaRegistro}</p>
            </div>
        </div>
        
        <div class="profile-form">
            <div class="form-group">
                <label for="profileName">
                    <i class="fas fa-user"></i> Nombre Completo
                </label>
                <input type="text" 
                       id="profileName" 
                       value="${datosPerfil.nombre || ''}"
                       placeholder="Tu nombre completo">
            </div>
            
            <div class="form-group">
                <label for="profilePhone">
                    <i class="fas fa-phone"></i> Teléfono
                </label>
                <input type="text" 
                       id="profilePhone" 
                       value="${datosPerfil.telefono || ''}"
                       placeholder="Ej: 0412-1234567">
            </div>
            
            <div class="form-group">
                <label for="profileEmail">
                    <i class="fas fa-envelope"></i> Correo Electrónico
                </label>
                <input type="email" 
                       id="profileEmail" 
                       value="${datosPerfil.correo || ''}"
                       placeholder="tu@correo.com">
            </div>
            
            <div class="form-group">
                <label for="profileCedula">
                    <i class="fas fa-id-card"></i> Cédula
                </label>
                <input type="text" 
                       id="profileCedula" 
                       value="${datosPerfil.cedula || ''}"
                       placeholder="Tu número de cédula">
            </div>
        </div>
    `;
}

// Renderizar estadísticas del usuario
function renderizarEstadisticasUsuario(estadisticas, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!estadisticas) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando estadísticas...</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">🎫</div>
                <div class="stat-value">${estadisticas.tickets_comprados || 0}</div>
                <div class="stat-label">Tickets Comprados</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-value">${estadisticas.recargas_aprobadas || 0}</div>
                <div class="stat-label">Recargas Aprobadas</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">📤</div>
                <div class="stat-value">${estadisticas.transferencias_enviadas || 0}</div>
                <div class="stat-label">Transferencias Enviadas</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">📥</div>
                <div class="stat-value">${estadisticas.transferencias_recibidas || 0}</div>
                <div class="stat-label">Transferencias Recibidas</div>
            </div>
        </div>
    `;
}

// Renderizar actividad reciente
function renderizarActividadReciente(actividad, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!actividad || actividad.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No hay actividad reciente</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    actividad.forEach(item => {
        const fecha = new Date(item.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div class="activity-item">
                <div class="activity-icon">${item.icono}</div>
                <div class="activity-content">
                    <div class="activity-text">${item.descripcion}</div>
                    <div class="activity-time">${fecha}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Renderizar formulario de cambio de contraseña
function renderizarFormularioPassword(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="password-form">
            <div class="form-group">
                <label for="currentPassword">
                    <i class="fas fa-lock"></i> Contraseña Actual
                </label>
                <input type="password" 
                       id="currentPassword" 
                       placeholder="Ingresa tu contraseña actual">
            </div>
            
            <div class="form-group">
                <label for="newPassword">
                    <i class="fas fa-key"></i> Nueva Contraseña
                </label>
                <input type="password" 
                       id="newPassword" 
                       placeholder="Mínimo 6 caracteres">
            </div>
            
            <div class="form-group">
                <label for="confirmPassword">
                    <i class="fas fa-check-circle"></i> Confirmar Contraseña
                </label>
                <input type="password" 
                       id="confirmPassword" 
                       placeholder="Repite la nueva contraseña">
            </div>
            
            <div class="password-requirements">
                <p><strong>Requisitos de seguridad:</strong></p>
                <ul>
                    <li>Mínimo 6 caracteres</li>
                    <li>Recomendado incluir números y letras</li>
                    <li>No uses contraseñas obvias</li>
                </ul>
            </div>
        </div>
    `;
}

// Validar datos del formulario de perfil
function validarDatosPerfil(datos) {
    const errores = [];
    
    if (!datos.nombre || datos.nombre.trim().length < 2) {
        errores.push('El nombre debe tener al menos 2 caracteres');
    }
    
    if (!datos.telefono || !/^\d{10,15}$/.test(datos.telefono.replace(/\D/g, ''))) {
        errores.push('El teléfono debe tener entre 10 y 15 dígitos');
    }
    
    if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
        errores.push('El correo electrónico no es válido');
    }
    
    if (datos.cedula && !/^\d{6,10}$/.test(datos.cedula.replace(/\D/g, ''))) {
        errores.push('La cédula debe tener entre 6 y 10 dígitos');
    }
    
    return {
        valido: errores.length === 0,
        errores: errores
    };
}

// Guardar cambios del perfil
async function guardarCambiosPerfil() {
    const datos = {
        nombre: document.getElementById('profileName')?.value || '',
        telefono: document.getElementById('profilePhone')?.value || '',
        correo: document.getElementById('profileEmail')?.value || '',
        cedula: document.getElementById('profileCedula')?.value || ''
    };
    
    const validacion = validarDatosPerfil(datos);
    if (!validacion.valido) {
        return {
            success: false,
            message: validacion.errores.join(', ')
        };
    }
    
    return await actualizarPerfil(datos);
}

// Exportar datos del perfil
function exportarDatosPerfil(formato = 'json') {
    try {
        const datosExportar = {
            perfil: datosPerfil,
            timestamp: new Date().toISOString(),
            exportadoDesde: 'Rifa 33 - Sistema de Gestión'
        };
        
        let contenido = '';
        let nombreArchivo = '';
        let tipoMime = '';
        
        switch(formato) {
            case 'json':
                contenido = JSON.stringify(datosExportar, null, 2);
                nombreArchivo = `perfil_${datosPerfil.nombre}_${new Date().toISOString().split('T')[0]}.json`;
                tipoMime = 'application/json';
                break;
                
            case 'txt':
                contenido = `
Perfil de Usuario - Rifa 33
===========================
Fecha de exportación: ${new Date().toLocaleDateString()}

Datos Personales:
-----------------
Nombre: ${datosPerfil.nombre}
Teléfono: ${datosPerfil.telefono}
Correo: ${datosPerfil.correo || 'No especificado'}
Cédula: ${datosPerfil.cedula || 'No especificado'}
Rol: ${datosPerfil.role === 'admin' ? 'Administrador' : 'Usuario'}
Puntos actuales: ${datosPerfil.puntos}
Fecha de registro: ${new Date(datosPerfil.created_at).toLocaleDateString()}
                `;
                nombreArchivo = `perfil_${datosPerfil.nombre}.txt`;
                tipoMime = 'text/plain';
                break;
        }
        
        const blob = new Blob([contenido], { type: tipoMime });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        link.click();
        
        URL.revokeObjectURL(url);
        
        return {
            success: true,
            message: `Datos exportados como ${formato.toUpperCase()}`
        };
        
    } catch (error) {
        console.error('Error al exportar datos:', error);
        return {
            success: false,
            message: 'Error al exportar datos'
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
        initPerfilSystem,
        cargarDatosPerfil,
        cargarEstadisticasUsuario,
        actualizarPerfil,
        cambiarContrasena,
        cargarActividadReciente,
        renderizarDatosPerfil,
        renderizarEstadisticasUsuario,
        renderizarActividadReciente,
        renderizarFormularioPassword,
        validarDatosPerfil,
        guardarCambiosPerfil,
        exportarDatosPerfil,
        mostrarNotificacion
    };
}