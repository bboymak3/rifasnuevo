// ==================== CONFIGURACIÓN ====================
const API_BASE = '/api';
const PUNTOS_POR_NUMERO = 10;
let currentUser = null;
let adminAuth = null;

// ==================== FUNCIONES DE UTILIDAD ====================
function mostrarAlerta(mensaje, tipo = 'info', elementoId = 'alert') {
    const alertDiv = document.getElementById(elementoId);
    if (alertDiv) {
        alertDiv.textContent = mensaje;
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.classList.remove('hidden');
        setTimeout(() => alertDiv.classList.add('hidden'), 5000);
    } else {
        alert(mensaje);
    }
}

function mostrarLoading(mensaje = 'Cargando...') {
    console.log('Loading:', mensaje);
    // Podrías implementar un spinner aquí
}

function ocultarLoading() {
    console.log('Loading oculto');
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

// ==================== AUTENTICACIÓN ====================
async function login(email, password) {
    mostrarLoading('Iniciando sesión...');
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        ocultarLoading();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            mostrarAlerta('¡Login exitoso! Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            return true;
        } else {
            mostrarAlerta(data.error || 'Error en login', 'error');
            return false;
        }
    } catch (error) {
        ocultarLoading();
        mostrarAlerta('Error de conexión con el servidor', 'error');
        return false;
    }
}

async function register(email, nombre, password) {
    mostrarLoading('Registrando usuario...');
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nombre, password })
        });
        
        const data = await response.json();
        ocultarLoading();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            mostrarAlerta('¡Registro exitoso! Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            return true;
        } else {
            mostrarAlerta(data.error || 'Error en registro', 'error');
            return false;
        }
    } catch (error) {
        ocultarLoading();
        mostrarAlerta('Error de conexión con el servidor', 'error');
        return false;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// ==================== DASHBOARD ====================
async function cargarDashboard() {
    if (!isLoggedIn()) {
        window.location.href = '/';
        return;
    }
    
    const user = getCurrentUser();
    if (!user) {
        logout();
        return;
    }
    
    // Actualizar UI
    if (document.getElementById('userNombre')) {
        document.getElementById('userNombre').textContent = user.nombre || user.email;
    }
    if (document.getElementById('userPuntos')) {
        document.getElementById('userPuntos').textContent = user.puntos;
    }
    if (document.getElementById('puntosStat')) {
        document.getElementById('puntosStat').textContent = user.puntos;
    }
    
    // Cargar datos
    await actualizarPuntos();
    await cargarNumeros();
    await cargarMisNumeros();
}

async function actualizarPuntos() {
    try {
        const response = await fetch(`${API_BASE}/usuario/puntos`, {
            headers: getAuthHeader()
        });
        
        const data = await response.json();
        if (data.success) {
            const puntos = data.puntos;
            
            // Actualizar en todos los elementos
            ['userPuntos', 'puntosStat'].forEach(id => {
                const elem = document.getElementById(id);
                if (elem) elem.textContent = puntos;
            });
            
            // Actualizar usuario en localStorage
            const user = getCurrentUser();
            if (user) {
                user.puntos = puntos;
                localStorage.setItem('user', JSON.stringify(user));
            }
        }
    } catch (error) {
        console.error('Error actualizando puntos:', error);
    }
}

async function cargarNumeros() {
    mostrarLoading('Cargando números...');
    try {
        const response = await fetch(`${API_BASE}/rifa/numeros`);
        const data = await response.json();
        ocultarLoading();
        
        if (data.success) {
            renderizarNumeros(data.numeros);
            actualizarEstadisticas(data.numeros);
        } else {
            mostrarAlerta('Error cargando números', 'error');
        }
    } catch (error) {
        ocultarLoading();
        mostrarAlerta('Error de conexión', 'error');
    }
}

function renderizarNumeros(numeros) {
    const grid = document.getElementById('numerosGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const userId = getCurrentUser()?.id;
    let disponibles = 0;
    
    numeros.forEach(numero => {
        const div = document.createElement('div');
        div.className = 'numero-item';
        div.dataset.id = numero.id;
        
        if (numero.estado === 'vendido') {
            div.classList.add('numero-vendido');
            if (numero.usuario_id === userId) {
                div.classList.add('numero-propio');
                div.title = `Tu número`;
            } else {
                div.title = `Vendido`;
            }
        } else {
            div.classList.add('numero-disponible');
            div.title = 'Disponible - Click para comprar';
            div.onclick = () => abrirModalCompra(numero.id);
            disponibles++;
        }
        
        div.innerHTML = `<div class="numero-id">${numero.id}</div>`;
        if (numero.estado === 'vendido' && numero.usuario_id === userId) {
            div.innerHTML += '⭐';
        }
        
        grid.appendChild(div);
    });
    
    // Actualizar contador de disponibles
    const elem = document.getElementById('disponiblesStat');
    if (elem) elem.textContent = disponibles;
}

function actualizarEstadisticas(numeros) {
    const userId = getCurrentUser()?.id;
    if (!userId) return;
    
    const misNumeros = numeros.filter(n => n.usuario_id === userId).length;
    
    // Actualizar contador
    const elem = document.getElementById('misNumerosStat');
    if (elem) elem.textContent = misNumeros;
}

async function cargarMisNumeros() {
    try {
        const response = await fetch(`${API_BASE}/rifa/numeros`);
        const data = await response.json();
        
        if (data.success) {
            const userId = getCurrentUser()?.id;
            const misNumeros = data.numeros.filter(n => n.usuario_id === userId);
            
            const container = document.getElementById('misNumerosList');
            if (container) {
                if (misNumeros.length > 0) {
                    container.innerHTML = misNumeros.map(n => 
                        `<span class="badge">#${n.id}</span>`
                    ).join(' ');
                } else {
                    container.innerHTML = '<em>Aún no has comprado números</em>';
                }
                
                // Actualizar contador
                const statElem = document.getElementById('misNumerosStat');
                if (statElem) statElem.textContent = misNumeros.length;
            }
        }
    } catch (error) {
        console.error('Error cargando mis números:', error);
    }
}

function abrirModalCompra(numeroId) {
    const user = getCurrentUser();
    if (!user) {
        mostrarAlerta('Debes iniciar sesión para comprar', 'error');
        return;
    }
    
    if (user.puntos < PUNTOS_POR_NUMERO) {
        mostrarAlerta(`Necesitas ${PUNTOS_POR_NUMERO} puntos. Tienes: ${user.puntos}`, 'error');
        return;
    }
    
    document.getElementById('modalNumero').textContent = numeroId;
    document.getElementById('modalPuntosRequeridos').textContent = PUNTOS_POR_NUMERO;
    document.getElementById('modalPuntosDisponibles').textContent = user.puntos;
    document.getElementById('modalPuntosRestantes').textContent = user.puntos - PUNTOS_POR_NUMERO;
    
    document.getElementById('compraModal').classList.remove('hidden');
}

async function confirmarCompra() {
    const numeroId = parseInt(document.getElementById('modalNumero').textContent);
    mostrarLoading('Procesando compra...');
    
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
        ocultarLoading();
        
        if (data.success) {
            mostrarAlerta(`¡Número ${numeroId} comprado exitosamente!`, 'success');
            document.getElementById('compraModal').classList.add('hidden');
            await cargarNumeros();
            await actualizarPuntos();
            await cargarMisNumeros();
        } else {
            mostrarAlerta(data.error || 'Error en la compra', 'error');
        }
    } catch (error) {
        ocultarLoading();
        mostrarAlerta('Error de conexión', 'error');
    }
}

// ==================== ADMIN ====================
async function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    if (!password) {
        mostrarAlerta('Ingresa la contraseña de administrador', 'error', 'adminAlert');
        return;
    }
    
    mostrarLoading('Verificando...');
    adminAuth = {
        headers: { 
            'Authorization': `Basic ${btoa(`admin:${password}`)}` 
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/usuarios`, {
            headers: adminAuth.headers
        });
        
        const data = await response.json();
        ocultarLoading();
        
        if (data.success) {
            mostrarAlerta('Acceso admin concedido', 'success', 'adminAlert');
            document.getElementById('adminLogin').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            cargarUsuariosAdmin();
            cargarNumerosVendidosAdmin();
        } else {
            mostrarAlerta('Contraseña incorrecta', 'error', 'adminAlert');
            adminAuth = null;
        }
    } catch (error) {
        ocultarLoading();
        mostrarAlerta('Error de conexión', 'error', 'adminAlert');
    }
}

async function cargarUsuariosAdmin() {
    if (!adminAuth) return;
    
    mostrarLoading('Cargando usuarios...');
    try {
        const response = await fetch(`${API_BASE}/admin/usuarios`, {
            headers: adminAuth.headers
        });
        
        const data = await response.json();
        ocultarLoading();
        
        if (data.success) {
            renderizarUsuariosAdmin(data.usuarios);
        } else {
            mostrarAlerta('Error cargando usuarios', 'error', 'adminAlert');
        }
    } catch (error) {
        ocultarLoading();
        mostrarAlerta('Error de conexión', 'error', 'adminAlert');
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
                <button onclick="mostrarAjustePuntos(${usuario.id}, '${usuario.email.replace(/'/g, "\\'")}')" 
                        class="btn btn-primary btn-sm">
                    <i class="fas fa-edit"></i> Ajustar
                </button>
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
                <td>${item.comprado_en ? new Date(item.comprado_en).toLocaleDateString('es-ES') : 'N/A'}</td>
            </tr>
        `).join('');
    }
}

function mostrarAjustePuntos(usuarioId, email) {
    document.getElementById('ajusteUsuarioId').value = usuarioId;
    document.getElementById('ajusteUsuarioEmail').textContent = email;
    document.getElementById('ajusteModal').classList.remove('hidden');
}

async function aplicarAjustePuntos() {
    const usuarioId = document.getElementById('ajusteUsuarioId').value;
    const puntos = parseInt(document.getElementById('ajustePuntos').value);
    const descripcion = document.getElementById('ajusteDescripcion').value;
    
    if (!puntos || !descripcion) {
        mostrarAlerta('Completa todos los campos', 'error', 'adminAlert');
        return;
    }
    
    mostrarLoading('Aplicando ajuste...');
    
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
        ocultarLoading();
        
        if (data.success) {
            mostrarAlerta(data.message, 'success', 'adminAlert');
            document.getElementById('ajusteModal').classList.add('hidden');
            document.getElementById('ajustePuntos').value = '';
            document.getElementById('ajusteDescripcion').value = '';
            await cargarUsuariosAdmin();
        } else {
            mostrarAlerta(data.error || 'Error en ajuste', 'error', 'adminAlert');
        }
    } catch (error) {
        ocultarLoading();
        mostrarAlerta('Error de conexión', 'error', 'adminAlert');
    }
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 App inicializando...');
    
    // Inicializar formularios si existen
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
            const email = document.getElementById('regEmail').value;
            const nombre = document.getElementById('regNombre').value;
            const password = document.getElementById('regPassword').value;
            register(email, nombre, password);
        });
    }
    
    // Inicializar dashboard si estamos en esa página
    if (window.location.pathname.includes('dashboard.html')) {
        cargarDashboard();
        
        // Recargar puntos cada 30 segundos
        setInterval(actualizarPuntos, 30000);
    }
    
    // Inicializar admin si estamos en esa página
    if (window.location.pathname.includes('admin.html')) {
        // Verificar si ya hay sesión de usuario
        if (isLoggedIn()) {
            // Mostrar botón para volver al dashboard
        }
    }
});

// ==================== FUNCIONES GLOBALES ====================
window.login = login;
window.register = register;
window.logout = logout;
window.confirmarCompra = confirmarCompra;
window.loginAdmin = loginAdmin;
window.mostrarAjustePuntos = mostrarAjustePuntos;
window.aplicarAjustePuntos = aplicarAjustePuntos;

console.log('✅ App.js cargado correctamente');