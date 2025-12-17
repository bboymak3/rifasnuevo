// /public/assets/app.js - Sistema completo de rifas
const API_BASE = '/api';
const PUNTOS_POR_NUMERO = 10;

// ==================== FUNCIONES DE AUTENTICACIÓN ====================
async function login(email, password) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('¡Login exitoso!', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            return true;
        } else {
            showAlert(data.error || 'Error en login', 'error');
            return false;
        }
    } catch (error) {
        hideLoading();
        showAlert('Error de conexión con el servidor', 'error');
        return false;
    }
}

async function register(email, nombre, password) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nombre, password })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('¡Registro exitoso!', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            return true;
        } else {
            showAlert(data.error || 'Error en registro', 'error');
            return false;
        }
    } catch (error) {
        hideLoading();
        showAlert('Error de conexión con el servidor', 'error');
        return false;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// ==================== FUNCIONES DE RIFA ====================
async function cargarDashboard() {
    if (!isLoggedIn()) {
        window.location.href = '/';
        return;
    }
    
    const user = getCurrentUser();
    document.getElementById('userNombre').textContent = user.nombre || user.email;
    document.getElementById('userPuntos').textContent = user.puntos;
    
    await actualizarPuntos();
    await cargarNumeros();
    cargarMisNumeros();
}

async function actualizarPuntos() {
    try {
        const response = await fetch(`${API_BASE}/usuario/puntos`, {
            headers: getAuthHeader()
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('userPuntos').textContent = data.puntos;
            // Actualizar usuario en localStorage
            const user = getCurrentUser();
            user.puntos = data.puntos;
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (error) {
        console.error('Error actualizando puntos:', error);
    }
}

async function cargarNumeros() {
    showLoading('Cargando números...');
    try {
        const response = await fetch(`${API_BASE}/rifa/numeros`);
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            renderizarNumeros(data.numeros);
        } else {
            showAlert('Error cargando números', 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Error de conexión', 'error');
    }
}

function renderizarNumeros(numeros) {
    const grid = document.getElementById('numerosGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const userId = getCurrentUser()?.id;
    
    numeros.forEach(numero => {
        const div = document.createElement('div');
        div.className = 'numero-item';
        div.dataset.id = numero.id;
        
        // Determinar clase CSS según estado
        if (numero.estado === 'vendido') {
            div.classList.add('numero-vendido');
            if (numero.usuario_id === userId) {
                div.classList.add('numero-propio');
                div.title = `Tu número - Comprado: ${formatFecha(numero.comprado_en)}`;
            } else {
                div.title = `Vendido a: ${numero.usuario_nombre || numero.usuario_email}`;
            }
        } else {
            div.classList.add('numero-disponible');
            div.title = 'Disponible - Click para comprar';
            div.onclick = () => abrirModalCompra(numero.id);
        }
        
        div.innerHTML = `
            <div class="numero-id">${numero.id}</div>
            ${numero.estado === 'vendido' && numero.usuario_id === userId ? '⭐' : ''}
        `;
        
        grid.appendChild(div);
    });
}

async function cargarMisNumeros() {
    try {
        const response = await fetch(`${API_BASE}/rifa/numeros`);
        const data = await response.json();
        
        if (data.success) {
            const userId = getCurrentUser()?.id;
            const misNumeros = data.numeros.filter(n => n.usuario_id === userId);
            
            const container = document.getElementById('misNumeros');
            if (container) {
                if (misNumeros.length > 0) {
                    container.innerHTML = misNumeros.map(n => 
                        `<span class="badge">#${n.id}</span>`
                    ).join(' ');
                } else {
                    container.innerHTML = '<em>Aún no has comprado números</em>';
                }
            }
        }
    } catch (error) {
        console.error('Error cargando mis números:', error);
    }
}

function abrirModalCompra(numeroId) {
    const user = getCurrentUser();
    if (!user) {
        showAlert('Debes iniciar sesión para comprar', 'error');
        return;
    }
    
    if (user.puntos < PUNTOS_POR_NUMERO) {
        showAlert(`Necesitas ${PUNTOS_POR_NUMERO} puntos. Tienes: ${user.puntos}`, 'error');
        return;
    }
    
    document.getElementById('modalNumeroId').textContent = numeroId;
    document.getElementById('modalPuntosRequeridos').textContent = PUNTOS_POR_NUMERO;
    document.getElementById('modalPuntosDisponibles').textContent = user.puntos;
    document.getElementById('modalPuntosRestantes').textContent = user.puntos - PUNTOS_POR_NUMERO;
    
    document.getElementById('compraModal').style.display = 'flex';
}

async function confirmarCompra() {
    const numeroId = parseInt(document.getElementById('modalNumeroId').textContent);
    showLoading('Procesando compra...');
    
    try {
        const response = await fetch(`${API_BASE}/rifa/comprar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ 
                numeroId, 
                puntosRequeridos: PUNTOS_POR_NUMERO 
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showAlert(`¡Número ${numeroId} comprado exitosamente!`, 'success');
            document.getElementById('compraModal').style.display = 'none';
            await cargarNumeros();
            await actualizarPuntos();
            await cargarMisNumeros();
        } else {
            showAlert(data.error || 'Error en la compra', 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Error de conexión', 'error');
    }
}

// ==================== FUNCIONES DE ADMIN ====================
let adminAuth = null;

async function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    if (!password) {
        showAlert('Ingresa la contraseña de administrador', 'error');
        return;
    }
    
    showLoading('Verificando...');
    adminAuth = {
        headers: { 
            'Authorization': `Basic ${btoa(`admin:${password}`)}` 
        }
    };
    
    try {
        // Probar la autenticación
        const response = await fetch(`${API_BASE}/admin/usuarios`, {
            headers: adminAuth.headers
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showAlert('Acceso admin concedido', 'success');
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            cargarUsuariosAdmin();
            cargarNumerosVendidosAdmin();
        } else {
            showAlert('Contraseña incorrecta', 'error');
            adminAuth = null;
        }
    } catch (error) {
        hideLoading();
        showAlert('Error de conexión', 'error');
    }
}

async function cargarUsuariosAdmin() {
    if (!adminAuth) return;
    
    showLoading('Cargando usuarios...');
    try {
        const response = await fetch(`${API_BASE}/admin/usuarios`, {
            headers: adminAuth.headers
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            renderizarUsuariosAdmin(data.usuarios);
        } else {
            showAlert('Error cargando usuarios', 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Error de conexión', 'error');
    }
}

function renderizarUsuariosAdmin(usuarios) {
    const tbody = document.getElementById('usuariosList');
    if (!tbody) return;
    
    tbody.innerHTML = usuarios.map(usuario => `
        <tr>
            <td>${usuario.id}</td>
            <td>${usuario.email}</td>
            <td>${usuario.nombre || '-'}</td>
            <td><strong>${usuario.puntos}</strong></td>
            <td>
                <div class="ajuste-puntos">
                    <button onclick="mostrarAjustePuntos(${usuario.id}, '${usuario.email}')" 
                            class="btn btn-primary btn-sm">
                        Ajustar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function cargarNumerosVendidosAdmin() {
    if (!adminAuth) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/numeros-vendidos`, {
            headers: adminAuth.headers
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderizarNumerosVendidosAdmin(data);
        }
    } catch (error) {
        console.error('Error cargando números vendidos:', error);
    }
}

function renderizarNumerosVendidosAdmin(data) {
    // Resumen
    const resumenElem = document.getElementById('resumenVentas');
    if (resumenElem && data.resumen) {
        resumenElem.innerHTML = `
            <strong>${data.resumen.total_vendidos}/100</strong> números vendidos | 
            <strong>${data.resumen.compradores_unicos}</strong> compradores únicos
        `;
    }
    
    // Lista de números
    const tbody = document.getElementById('numerosVendidosList');
    if (tbody && data.numeros) {
        tbody.innerHTML = data.numeros.map(item => `
            <tr>
                <td><strong>#${item.numero}</strong></td>
                <td>${item.email}</td>
                <td>${item.nombre || '-'}</td>
                <td>${formatFecha(item.comprado_en)}</td>
            </tr>
        `).join('');
    }
}

function mostrarAjustePuntos(usuarioId, email) {
    document.getElementById('ajusteUsuarioId').value = usuarioId;
    document.getElementById('ajusteUsuarioEmail').textContent = email;
    document.getElementById('ajusteModal').style.display = 'flex';
}

async function aplicarAjustePuntos() {
    const usuarioId = document.getElementById('ajusteUsuarioId').value;
    const puntos = parseInt(document.getElementById('ajustePuntos').value);
    const descripcion = document.getElementById('ajusteDescripcion').value;
    
    if (!puntos || !descripcion) {
        showAlert('Completa todos los campos', 'error');
        return;
    }
    
    showLoading('Aplicando ajuste...');
    
    try {
        const response = await fetch(`${API_BASE}/admin/ajustar-puntos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...adminAuth.headers
            },
            body: JSON.stringify({ usuarioId, puntos, descripcion })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showAlert(data.message, 'success');
            document.getElementById('ajusteModal').style.display = 'none';
            document.getElementById('ajustePuntos').value = '';
            document.getElementById('ajusteDescripcion').value = '';
            await cargarUsuariosAdmin();
        } else {
            showAlert(data.error || 'Error en ajuste', 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Error de conexión', 'error');
    }
}

// ==================== FUNCIONES DE UTILIDAD ====================
function showAlert(message, type = 'info') {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) {
        // Crear alerta si no existe
        const div = document.createElement('div');
        div.id = 'globalAlert';
        div.className = `alert alert-${type}`;
        div.innerHTML = `
            ${message}
            <button onclick="this.parentElement.style.display='none'" style="float:right; background:none; border:none;">
                ×
            </button>
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    } else {
        alertDiv.textContent = message;
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.display = 'block';
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }
}

function showLoading(message = 'Cargando...') {
    let loadingDiv = document.getElementById('loadingOverlay');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingOverlay';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    text-align: center;
                ">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function formatFecha(fechaStr) {
    if (!fechaStr) return 'N/A';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function cambiarTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar el tab seleccionado
    document.getElementById(tabName).classList.add('active');
    
    // Actualizar navegación de tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación según la página
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard.html') || 
        currentPage.includes('admin.html')) {
        if (!isLoggedIn() && !currentPage.includes('admin.html')) {
            window.location.href = '/';
        }
    }
    
    // Inicializar eventos
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            login(email, password);
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const nombre = document.getElementById('nombre').value;
            const password = document.getElementById('password').value;
            register(email, nombre, password);
        });
    }
    
    // Inicializar dashboard
    if (currentPage.includes('dashboard.html')) {
        cargarDashboard();
        
        // Recargar puntos cada 30 segundos
        setInterval(actualizarPuntos, 30000);
    }
    
    // Inicializar admin
    if (currentPage.includes('admin.html')) {
        // Si ya hay auth de admin, cargar datos
        if (adminAuth) {
            cargarUsuariosAdmin();
            cargarNumerosVendidosAdmin();
        }
    }
    
    // Eventos de modales
    const closeButtons = document.querySelectorAll('.close-modal, .btn-cancel');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Cerrar modal al hacer click fuera
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
});

// Hacer funciones disponibles globalmente
window.login = login;
window.register = register;
window.logout = logout;
window.confirmarCompra = confirmarCompra;
window.loginAdmin = loginAdmin;
window.mostrarAjustePuntos = mostrarAjustePuntos;
window.aplicarAjustePuntos = aplicarAjustePuntos;
window.cambiarTab = cambiarTab;
window.showAlert = showAlert;
'@ | Out-File -FilePath public\assets\app.js -Encoding UTF8