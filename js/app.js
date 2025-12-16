const CONFIG = {
  precioTicket: 499.00,
  rifaId: 140
};

let estadoApp = {
  ticketsDisponibles: [],
  ticketsSeleccionados: [],
  total: 0
};

document.addEventListener('DOMContentLoaded', function() {
  cargarEstadisticas();
  cargarTicketsDisponibles();
});

async function cargarEstadisticas() {
  try {
    const response = await fetch('/api/estadisticas');
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('ticketsVendidos').textContent = data.data.vendidos;
      document.getElementById('ticketsDisponibles').textContent = data.data.disponibles;
      document.getElementById('totalRecaudado').textContent = `Bs. ${(data.data.recaudado || 0).toFixed(2)}`;
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
      estadoApp.ticketsDisponibles = data.data.disponibles;
      mostrarTicketsDisponibles();
    }
  } catch (error) {
    console.error('Error cargando tickets:', error);
  }
}

function mostrarTicketsDisponibles() {
  const grid = document.getElementById('ticketGrid');
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
  if (estadoApp.ticketsSeleccionados.length === 0) {
    selectedDiv.innerHTML = '<span class="text-muted">No hay tickets seleccionados</span>';
  } else {
    selectedDiv.innerHTML = estadoApp.ticketsSeleccionados.map(num => 
      `<span class="badge bg-success me-2">${num}</span>`
    ).join('');
  }

  estadoApp.total = estadoApp.ticketsSeleccionados.length * CONFIG.precioTicket;
  document.getElementById('totalPagar').textContent = estadoApp.total.toFixed(2);
  document.getElementById('btnPagar').disabled = estadoApp.ticketsSeleccionados.length === 0;
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

  sessionStorage.setItem('ticketsSeleccionados', JSON.stringify(estadoApp.ticketsSeleccionados));
  sessionStorage.setItem('totalPago', estadoApp.total.toString());
  
  window.location.href = `/compra.html?tickets=${estadoApp.ticketsSeleccionados.join(',')}&total=${estadoApp.total}`;
}

setInterval(() => {
  cargarEstadisticas();
  cargarTicketsDisponibles();
}, 30000); 