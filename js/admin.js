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
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/estadisticas`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
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
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/tickets-vendidos`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
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
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/ordenes`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tabla = document.getElementById('tablaOrdenes');
    
    if (data.success) {
      if (data.data.ordenes.length === 0) {
        tabla.innerHTML = '<tr><td colspan="9" class="text-center">No hay órdenes registradas</td></tr>';
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
          <td>
            <small>
              ${(orden.tickets || orden.ticket_id || 'N/A').split(',').map(num => 
                `<span class="badge bg-secondary me-1">${num.trim()}</span>`
              ).join('')}
            </small>
          </td>
          <td>Bs. ${orden.total}</td>
          <td>${orden.metodo_pago}</td>
          <td>
            <span class="badge ${getBadgeClass(orden.estado)}">
              ${orden.estado}
            </span>
          </td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-success" onclick="cambiarEstado(${orden.id}, 'verificado')" ${orden.estado === 'verificado' ? 'disabled' : ''}>
                ✅ Verificar
              </button>
              <button class="btn btn-danger" onclick="cambiarEstado(${orden.id}, 'rechazado')" ${orden.estado === 'rechazado' ? 'disabled' : ''}>
                ❌ Rechazar
              </button>
              ${orden.estado !== 'pendiente' ? `
                <button class="btn btn-warning" onclick="cambiarEstado(${orden.id}, 'pendiente')">
                  🔄 Pendiente
                </button>
              ` : ''}
            </div>
          </td>
          <td>${new Date(orden.fecha_creacion).toLocaleString()}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error cargando órdenes:', error);
    document.getElementById('tablaOrdenes').innerHTML = 
      '<tr><td colspan="9" class="text-center text-danger">Error cargando órdenes</td></tr>';
  }
}

function getBadgeClass(estado) {
  switch(estado) {
    case 'verificado': return 'badge-verificado';
    case 'rechazado': return 'badge-rechazado';
    default: return 'badge-pendiente';
  }
}

async function cambiarEstado(ordenId, nuevoEstado) {
  if (!confirm(`¿Estás seguro de cambiar el estado a "${nuevoEstado}"?`)) {
    return;
  }

  try {
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/cambiar-estado`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        ordenId: ordenId, 
        nuevoEstado: nuevoEstado 
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        alert('✅ Estado actualizado correctamente');
        cargarOrdenes(); // Recargar la tabla
      } else {
        alert('❌ Error: ' + data.error);
      }
    } else {
      throw new Error(`Error ${response.status}`);
    }
  } catch (error) {
    console.error('Error cambiando estado:', error);
    alert('❌ Error al cambiar el estado');
  }
}

setInterval(() => {
  cargarPanelAdmin();
}, 30000);