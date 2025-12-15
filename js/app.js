// app.js - VERSIÓN ACTUALIZADA
const CONFIG = {
  precioTicket: 100, // En créditos, no en Bs
  rifaId: 1
};

let estadoApp = {
  ticketsDisponibles: [],
  ticketsSeleccionados: [],
  usuario: null
};

document.addEventListener('DOMContentLoaded', function() {
  // Verificar si el usuario está logueado
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userData = localStorage.getItem('user');
  
  if (isLoggedIn && userData) {
    estadoApp.usuario = JSON.parse(userData);
    document.getElementById('userInfo').innerHTML = `
      <span style="margin-right: 15px;">👤 ${estadoApp.usuario.nombre}</span>
      <span class="badge bg-primary">💰 ${estadoApp.usuario.creditos} créditos</span>
    `;
  } else {
    // Usuario no autenticado: permitimos ver y seleccionar tickets, pero no comprar.
    estadoApp.usuario = null;
    document.getElementById('userInfo').innerHTML = `
      <a href="login.html" class="btn btn-sm btn-outline-primary">Iniciar Sesión</a>
      <a href="registro.html" class="btn btn-sm btn-outline-secondary" style="margin-left:8px;">Registrarse</a>
    `;
  }
  
  cargarEstadisticas();
  cargarTicketsDisponibles();
  
  // Configurar eventos
  const btnPagar = document.getElementById('btnPagar');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const btnLogout = document.getElementById('btnLogout');
  if (btnPagar) btnPagar.addEventListener('click', procederPago);
  if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarSeleccion);
  if (btnLogout) btnLogout.addEventListener('click', logout);
});

async function cargarEstadisticas() {
  try {
    const response = await fetch('/api/estadisticas');
    const data = await response.json();
    
    if (data.success) {
      const stats = data.estadisticas;
      document.getElementById('ticketsVendidos').textContent = stats.tickets.vendidos;
      document.getElementById('ticketsDisponibles').textContent = stats.tickets.disponibles;
      document.getElementById('totalRecaudado').textContent = `${stats.recaudado} créditos`;
      document.getElementById('porcentajeVendido').textContent = `${stats.tickets.porcentaje}%`;
      
      // Mostrar últimos tickets vendidos
      const ultimosContainer = document.getElementById('ultimosVendidos');
      if (stats.ultimosVendidos.length > 0) {
        ultimosContainer.innerHTML = stats.ultimosVendidos.map(t => 
          `<span class="badge bg-secondary me-1">#${t.numero}</span>`
        ).join('');
      }
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

async function cargarTicketsDisponibles() {
  try {
    const response = await fetch('/api/tickets-disponibles');
    const data = await response.json();
    
    if (data.success) {
      estadoApp.ticketsDisponibles = data.disponibles;
      mostrarTicketsDisponibles();
    }
  } catch (error) {
    console.error('Error cargando tickets:', error);
  }
}

function mostrarTicketsDisponibles() {
  const grid = document.getElementById('ticketGrid');
  if (!grid) return;
  
  grid.innerHTML = '';

  for (let i = 1; i <= 100; i++) {
    const ticket = document.createElement('div');
    ticket.className = 'ticket-number';
    ticket.textContent = i;
    ticket.dataset.numero = i;

    if (estadoApp.ticketsDisponibles.includes(i)) {
      ticket.classList.add('disponible');
      ticket.addEventListener('click', () => seleccionarTicket(i));
    } else {
      ticket.classList.add('vendido');
      ticket.title = 'Ticket vendido';
    }

    if (estadoApp.ticketsSeleccionados.includes(i)) {
      ticket.classList.add('selected');
    }

    grid.appendChild(ticket);
  }
}

function seleccionarTicket(numero) {
  const index = estadoApp.ticketsSeleccionados.indexOf(numero);
  
  if (index === -1) {
    estadoApp.ticketsSeleccionados.push(numero);
  } else {
    estadoApp.ticketsSeleccionados.splice(index, 1);
  }

  actualizarInterfaz();
}

function actualizarInterfaz() {
  mostrarTicketsDisponibles();
  
  const selectedDiv = document.getElementById('selectedTickets');
  const totalCreditos = estadoApp.ticketsSeleccionados.length * CONFIG.precioTicket;
  
  if (estadoApp.ticketsSeleccionados.length === 0) {
    selectedDiv.innerHTML = '<span class="text-muted">No hay tickets seleccionados</span>';
  } else {
    selectedDiv.innerHTML = `
      <div>
        <strong>Tickets seleccionados (${estadoApp.ticketsSeleccionados.length}):</strong>
        <div class="mt-2">
          ${estadoApp.ticketsSeleccionados.map(num => 
            `<span class="badge bg-success me-1 mb-1">#${num}</span>`
          ).join('')}
        </div>
        <div class="mt-2">
          <strong>Total:</strong> ${totalCreditos} créditos
        </div>
      </div>
    `;
  }

  document.getElementById('totalPagar').textContent = totalCreditos;
  
  const btnPagar = document.getElementById('btnPagar');
  if (btnPagar) {
    btnPagar.disabled = estadoApp.ticketsSeleccionados.length === 0;
    
    // Verificar si tiene créditos suficientes
    const creditosUsuario = estadoApp.usuario ? estadoApp.usuario.creditos : 0;
    if (totalCreditos > creditosUsuario) {
      btnPagar.textContent = 'CRÉDITOS INSUFICIENTES';
      btnPagar.classList.add('btn-danger');
      btnPagar.classList.remove('btn-success');
    } else {
      btnPagar.textContent = `PAGAR ${totalCreditos} CRÉDITOS`;
      btnPagar.classList.add('btn-success');
      btnPagar.classList.remove('btn-danger');
    }
  }
}

function limpiarSeleccion() {
  estadoApp.ticketsSeleccionados = [];
  actualizarInterfaz();
}

function procederPago() {
  if (estadoApp.ticketsSeleccionados.length === 0) {
    alert('⚠️ Selecciona al menos un ticket');
    return;
  }

  if (!estadoApp.usuario) {
    if (confirm('Debes iniciar sesión para comprar tickets. ¿Deseas ir al login ahora?')) {
      window.location.href = 'login.html';
    }
    return;
  }

  const totalCreditos = estadoApp.ticketsSeleccionados.length * CONFIG.precioTicket;
  const creditosUsuario = estadoApp.usuario ? estadoApp.usuario.creditos : 0;
  
  if (totalCreditos > creditosUsuario) {
    alert(`❌ Créditos insuficientes. Necesitas ${totalCreditos} créditos, pero solo tienes ${creditosUsuario}.`);
    return;
  }

  // Guardar en sessionStorage
  sessionStorage.setItem('ticketsSeleccionados', JSON.stringify(estadoApp.ticketsSeleccionados));
  sessionStorage.setItem('totalCreditos', totalCreditos.toString());
  
  // Redirigir a compra.html con parámetros
  window.location.href = `compra.html?tickets=${estadoApp.ticketsSeleccionados.join(',')}&total=${totalCreditos}`;
}

function logout() {
  if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
}

// Recargar datos cada 30 segundos
setInterval(() => {
  cargarEstadisticas();
  cargarTicketsDisponibles();
}, 30000);

// CSS necesario (añade esto en tu HTML o crea un archivo CSS)
const style = document.createElement('style');
style.textContent = `
  .ticket-number {
    display: inline-block;
    width: 40px;
    height: 40px;
    line-height: 40px;
    text-align: center;
    margin: 2px;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
  }
  
  .ticket-number.disponible {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .ticket-number.disponible:hover {
    background-color: #c3e6cb;
  }
  
  .ticket-number.vendido {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .ticket-number.selected {
    background-color: #007bff;
    color: white;
    border-color: #0056b3;
  }
  
  .badge {
    font-size: 14px;
    padding: 5px 10px;
  }
`;
document.head.appendChild(style);