 
document.addEventListener('DOMContentLoaded', function() {
  cargarPanelAdmin();
});

async function cargarPanelAdmin() {
  await cargarEstadisticas();
  await cargarTicketsVendidos();
  await cargarOrdenes();
}

async function cargarEstadisticas() {
  try {
    const response = await fetch('/api/estadisticas');
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('ticketsVendidos').textContent = data.data.vendidos;
      document.getElementById('ticketsDisponibles').textContent = data.data.disponibles;
      document.getElementById('totalRecaudado').textContent = `Bs. ${(data.data.recaudado || 0).toFixed(2)}`;
      document.getElementById('totalOrdenes').textContent = data.data.totalOrdenes;
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

async function cargarTicketsVendidos() {
  try {
    const response = await fetch('/api/tickets-vendidos');
    const data = await response.json();
    const container = document.getElementById('listaTicketsVendidos');
    
    if (data.success) {
      if (data.data.tickets.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No hay tickets vendidos aún</p>';
        return;
      }
      
      const ticketsHTML = data.data.tickets.map(ticket => 
        `<span class="ticket-badge" title="${ticket.nombre} - ${ticket.telefono}">${ticket.numero}</span>`
      ).join('');
      
      container.innerHTML = `
        <p><strong>Total vendidos:</strong> ${data.data.tickets.length}</p>
        ${ticketsHTML}
      `;
    }
  } catch (error) {
    console.error('Error cargando tickets:', error);
    document.getElementById('listaTicketsVendidos').innerHTML = 
      '<p class="text-center text-danger">Error cargando tickets</p>';
  }
}

async function cargarOrdenes() {
  try {
    const response = await fetch('/api/ordenes');
    const data = await response.json();
    const tabla = document.getElementById('tablaOrdenes');
    
    if (data.success) {
      if (data.data.ordenes.length === 0) {
        tabla.innerHTML = '<tr><td colspan="8" class="text-center">No hay órdenes registradas</td></tr>';
        return;
      }
      
      tabla.innerHTML = data.data.ordenes.map(orden => `
        <tr>
          <td><small>${orden.id}</small></td>
          <td>
            <strong>${orden.nombre}</strong><br>
            <small class="text-muted">${orden.email || 'Sin email'}</small>
          </td>
          <td>${orden.telefono}</td>
          <td>${orden.tickets}</td>
          <td>Bs. ${orden.total}</td>
          <td>${orden.metodo_pago}</td>
          <td>
            <span class="badge ${orden.estado === 'pendiente' ? 'bg-warning' : 'bg-success'}">
              ${orden.estado}
            </span>
          </td>
          <td>${new Date(orden.fecha_creacion).toLocaleString()}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error cargando órdenes:', error);
    document.getElementById('tablaOrdenes').innerHTML = 
      '<tr><td colspan="8" class="text-center text-danger">Error cargando órdenes</td></tr>';
  }
}

setInterval(() => {
  cargarPanelAdmin();
}, 30000);