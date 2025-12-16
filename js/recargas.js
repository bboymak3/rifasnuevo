// recargas.js - Funciones específicas para manejo de recargas

// Variables globales
let recargaActual = {
    monto: 0,
    puntos: 0,
    metodo: null,
    referencia: '',
    comprobante: null
};

let tasaCambio = 100; // Puntos por dólar

// Inicializar sistema de recargas
async function initRecargasSystem() {
    try {
        // Cargar configuración
        const config = await obtenerUno("SELECT puntos_por_dolar FROM system_config WHERE id = 1");
        if (config) {
            tasaCambio = config.puntos_por_dolar;
        }
        
        // Cargar historial de recargas
        await cargarHistorialRecargas();
        
        return true;
    } catch (error) {
        console.error('Error al inicializar sistema de recargas:', error);
        return false;
    }
}

// Calcular puntos basados en monto
function calcularPuntos(monto) {
    return Math.floor(monto * tasaCambio);
}

// Actualizar resumen de recarga
function actualizarResumenRecarga() {
    const puntos = calcularPuntos(recargaActual.monto);
    recargaActual.puntos = puntos;
    
    // Actualizar elementos UI si existen
    const elementosUI = {
        'resumenMonto': `$${recargaActual.monto.toFixed(2)}`,
        'resumenPuntos': `${puntos.toLocaleString()} puntos`,
        'resumenMetodo': recargaActual.metodo ? 
            (recargaActual.metodo === 'pago_movil' ? 'Pago Móvil' : 
             recargaActual.metodo === 'transferencia' ? 'Transferencia Bancaria' : 
             'Depósito en Efectivo') : 'No seleccionado',
        'resumenReferencia': recargaActual.referencia || 'Sin referencia'
    };
    
    Object.keys(elementosUI).forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = elementosUI[id];
        }
    });
}

// Seleccionar monto de recarga
function seleccionarMonto(monto) {
    recargaActual.monto = parseFloat(monto);
    actualizarResumenRecarga();
    
    // Actualizar botones de montos
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Marcar botón seleccionado si existe
    const selectedBtn = event?.target?.closest('.amount-btn');
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
    
    // Validar monto mínimo
    const siguienteBtn = document.getElementById('siguienteBtn');
    if (siguienteBtn) {
        siguienteBtn.disabled = recargaActual.monto < 5;
    }
}

// Seleccionar método de pago
function seleccionarMetodoPago(metodo) {
    recargaActual.metodo = metodo;
    actualizarResumenRecarga();
    
    // Actualizar tarjetas de método
    document.querySelectorAll('.method-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar tarjeta seleccionada
    const selectedCard = event?.target?.closest('.method-card');
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Mostrar información según método
    const infoBancaria = document.getElementById('infoBancaria');
    const infoPagoMovil = document.getElementById('infoPagoMovil');
    
    if (infoBancaria) infoBancaria.style.display = 'none';
    if (infoPagoMovil) infoPagoMovil.style.display = 'none';
    
    if (metodo === 'transferencia' || metodo === 'efectivo') {
        if (infoBancaria) infoBancaria.style.display = 'block';
    } else if (metodo === 'pago_movil') {
        if (infoPagoMovil) infoPagoMovil.style.display = 'block';
    }
}

// Configurar carga de archivo
function configurarCargaArchivo() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) return;
    
    // Click en área
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            manejarCargaArchivo(fileInput);
        }
    });
    
    // Cambio en input de archivo
    fileInput.addEventListener('change', function() {
        manejarCargaArchivo(this);
    });
}

// Manejar carga de archivo
function manejarCargaArchivo(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validaciones
    if (file.size > 5 * 1024 * 1024) {
        mostrarNotificacion('El archivo es muy grande. Máximo 5MB.', 'error');
        return;
    }
    
    const tiposValidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!tiposValidos.includes(file.type)) {
        mostrarNotificacion('Formato no válido. Usa JPG, PNG o PDF.', 'error');
        return;
    }
    
    // Guardar archivo
    recargaActual.comprobante = file;
    
    // Mostrar vista previa
    mostrarVistaPrevia(file);
    actualizarResumenRecarga();
}

// Mostrar vista previa de archivo
function mostrarVistaPrevia(file) {
    const previewContainer = document.getElementById('previewContainer');
    const previewContent = document.getElementById('previewContent');
    const confirmReceipt = document.getElementById('confirmReceipt');
    
    if (!previewContainer || !previewContent) return;
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewContent.innerHTML = `
                <img src="${e.target.result}" style="max-width: 200px; border-radius: 5px;">
                <p>${file.name}</p>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        previewContent.innerHTML = `
            <div class="file-icon">
                <i class="fas fa-file-pdf" style="font-size: 40px; color: #f44336;"></i>
            </div>
            <p>${file.name}</p>
        `;
    }
    
    previewContainer.style.display = 'block';
    
    if (confirmReceipt) {
        confirmReceipt.textContent = file.name;
    }
}

// Eliminar archivo cargado
function eliminarArchivo() {
    recargaActual.comprobante = null;
    
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const confirmReceipt = document.getElementById('confirmReceipt');
    
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (confirmReceipt) confirmReceipt.textContent = 'No subido';
}

// Solicitar recarga
async function solicitarRecarga() {
    const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
    
    if (!validarRecarga()) {
        return;
    }
    
    try {
        // En un sistema real, aquí subirías el archivo al servidor
        let comprobanteUrl = '';
        if (recargaActual.comprobante) {
            // Simular subida
            comprobanteUrl = `uploads/${Date.now()}_${recargaActual.comprobante.name}`;
        }
        
        // Insertar en base de datos
        const resultado = await ejecutarComando(`
            INSERT INTO recargas (
                user_id, monto, puntos_solicitados, 
                metodo, comprobante_url, referencia,
                estado, fecha_solicitud
            ) VALUES (
                ${usuario.id},
                ${recargaActual.monto},
                ${recargaActual.puntos},
                '${recargaActual.metodo}',
                '${comprobanteUrl}',
                '${recargaActual.referencia}',
                'pendiente',
                CURRENT_TIMESTAMP
            )
        `);
        
        if (resultado.success) {
            mostrarNotificacion('✅ Solicitud de recarga enviada exitosamente', 'success');
            limpiarFormulario();
            await cargarHistorialRecargas();
            
            // Ejecutar callback si existe
            if (typeof onRechargeSuccess === 'function') {
                onRechargeSuccess(resultado);
            }
            
            return resultado;
        } else {
            throw new Error('Error al guardar recarga');
        }
        
    } catch (error) {
        console.error('Error al solicitar recarga:', error);
        mostrarNotificacion('❌ Error al enviar la solicitud', 'error');
        throw error;
    }
}

// Validar datos de recarga
function validarRecarga() {
    if (recargaActual.monto < 5) {
        mostrarNotificacion('El monto mínimo es $5.00', 'error');
        return false;
    }
    
    if (!recargaActual.metodo) {
        mostrarNotificacion('Selecciona un método de pago', 'error');
        return false;
    }
    
    if (!recargaActual.referencia && !recargaActual.comprobante) {
        mostrarNotificacion('Proporciona una referencia o sube un comprobante', 'error');
        return false;
    }
    
    return true;
}

// Cargar historial de recargas
async function cargarHistorialRecargas() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        const historial = await obtenerDatos(`
            SELECT id, monto, puntos_solicitados, metodo, estado, 
                   fecha_solicitud, fecha_resolucion, mensaje_admin
            FROM recargas 
            WHERE user_id = ${usuario.id}
            ORDER BY fecha_solicitud DESC
            LIMIT 10
        `);
        
        return historial;
        
    } catch (error) {
        console.error('Error al cargar historial:', error);
        return [];
    }
}

// Renderizar historial en tabla
function renderizarHistorial(historial, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (historial.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-coins"></i>
                    <p>No has realizado ninguna recarga aún</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    historial.forEach(item => {
        const fecha = new Date(item.fecha_solicitud).toLocaleDateString();
        let estadoClass = '';
        let estadoText = '';
        
        switch(item.estado) {
            case 'pendiente':
                estadoClass = 'status-pending';
                estadoText = 'Pendiente';
                break;
            case 'aprobado':
                estadoClass = 'status-approved';
                estadoText = 'Aprobado';
                break;
            case 'rechazado':
                estadoClass = 'status-rejected';
                estadoText = 'Rechazado';
                break;
        }
        
        html += `
            <tr>
                <td>${fecha}</td>
                <td>$${item.monto.toFixed(2)}</td>
                <td>${item.puntos_solicitados.toLocaleString()} pts</td>
                <td>${item.metodo === 'pago_movil' ? 'Pago Móvil' : 
                      item.metodo === 'transferencia' ? 'Transferencia' : 
                      'Depósito'}</td>
                <td><span class="status-badge ${estadoClass}">${estadoText}</span></td>
                <td>
                    ${item.mensaje_admin ? 
                      `<button class="btn-small" onclick="verMensajeAdmin('${item.mensaje_admin}')">
                        <i class="fas fa-eye"></i> Ver mensaje
                       </button>` : ''}
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

// Ver mensaje del administrador
function verMensajeAdmin(mensaje) {
    alert(`Mensaje del administrador:\n\n${mensaje}`);
}

// Limpiar formulario de recarga
function limpiarFormulario() {
    recargaActual = {
        monto: 0,
        puntos: 0,
        metodo: null,
        referencia: '',
        comprobante: null
    };
    
    // Limpiar UI
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelectorAll('.method-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const inputs = ['customAmount', 'referenceNumber', 'confirmTerms'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        }
    });
    
    eliminarArchivo();
    actualizarResumenRecarga();
}

// Navegar entre pasos del formulario
function navegarPaso(pasoActual, siguientePaso) {
    const pasos = document.querySelectorAll('.step-form');
    const indicadores = document.querySelectorAll('.step-indicator');
    
    if (pasoActual < 1 || pasoActual > pasos.length) return;
    
    // Ocultar todos los pasos
    pasos.forEach(paso => {
        paso.style.display = 'none';
    });
    
    // Mostrar paso actual
    const pasoElement = document.getElementById(`step${pasoActual}`);
    if (pasoElement) {
        pasoElement.style.display = 'block';
    }
    
    // Actualizar indicadores
    indicadores.forEach((indicador, index) => {
        indicador.classList.remove('active', 'completed');
        if (index + 1 < pasoActual) {
            indicador.classList.add('completed');
        } else if (index + 1 === pasoActual) {
            indicador.classList.add('active');
        }
    });
    
    // Ejecutar función de inicialización si existe
    const initFunction = window[`initStep${pasoActual}`];
    if (typeof initFunction === 'function') {
        initFunction();
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
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initRecargasSystem,
        seleccionarMonto,
        seleccionarMetodoPago,
        configurarCargaArchivo,
        manejarCargaArchivo,
        solicitarRecarga,
        cargarHistorialRecargas,
        renderizarHistorial,
        limpiarFormulario,
        navegarPaso
    };
}