// Función para iniciar sesión
async function loginUsuario(telefono, password) {
    try {
        // Primero obtenemos el usuario por teléfono
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: `SELECT id, nombre, telefono, puntos, role, password_hash 
                      FROM users WHERE telefono = '${telefono}'`
            })
        });

        const data = await response.json();
        
        if (!data.success || !data.result[0].results[0]) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        
        const usuario = data.result[0].results[0];
        
        // En producción, usar bcrypt para verificar la contraseña
        // Por ahora hacemos verificación simple
        if (password === 'admin123' || password === 'usuario123') {
            // Guardar usuario en localStorage
            localStorage.setItem('usuarioRifa', JSON.stringify({
                id: usuario.id,
                nombre: usuario.nombre,
                telefono: usuario.telefono,
                puntos: usuario.puntos,
                role: usuario.role
            }));
            
            return { success: true, usuario: usuario };
        } else {
            return { success: false, message: 'Contraseña incorrecta' };
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, message: 'Error del servidor' };
    }
}

// Función para registrar usuario
async function registrarUsuario(nombre, telefono, cedula, correo, password) {
    try {
        // Hash de contraseña simple (en producción usar bcrypt)
        const passwordHash = `$2a$10$${btoa(password).substring(0, 30)}`;
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: `INSERT INTO users (nombre, telefono, cedula, correo, password_hash, puntos) 
                      VALUES ('${nombre}', '${telefono}', '${cedula}', '${correo}', 
                      '${passwordHash}', 0) RETURNING *`
            })
        });

        const data = await response.json();
        
        if (data.success) {
            const usuario = data.result[0].results[0];
            
            localStorage.setItem('usuarioRifa', JSON.stringify({
                id: usuario.id,
                nombre: usuario.nombre,
                telefono: usuario.telefono,
                puntos: usuario.puntos,
                role: usuario.role
            }));
            
            return { success: true, usuario: usuario };
        } else {
            return { success: false, message: 'Error al registrar usuario' };
        }
        
    } catch (error) {
        console.error('Error en registro:', error);
        return { success: false, message: 'Error del servidor' };
    }
}

// Función para cerrar sesión
function logoutUsuario() {
    localStorage.removeItem('usuarioRifa');
    window.location.href = 'login.html';
}

// Verificar autenticación
function verificarAutenticacion() {
    const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
    if (!usuario) {
        window.location.href = 'login.html';
    }
    return usuario;
}