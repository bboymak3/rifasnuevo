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
      // 🔍 DEBUG: VER QUÉ CAMPOS LLEGAN REALMENTE
      console.log('=== DEBUG - ESTRUCTURA DE DATOS ===');
      console.log('Primera orden completa:', data.data.ordenes[0]);
      console.log('Campos disponibles:', Object.keys(data.data.ordenes[0]));
      console.log('Valor de tickets:', data.data.ordenes[0].tickets);
      console.log('Valor de ticket_id:', data.data.ordenes[0].ticket_id);
      console.log('=== FIN DEBUG ===');
      
      if (data.data.ordenes.length === 0) {
        tabla.innerHTML = '<tr><td colspan="10" class="text-center">No hay órdenes registradas</td></tr>';
        return;
      }
      
      // ... el resto de tu código igual
      tabla.innerHTML = data.data.ordenes.map(orden => `
        <tr>
          <td><small>${orden.id}</small></td>
          <td>
            <strong>${orden.nombre}</strong><br>
            <small class="text-muted">${orden.email || 'Sin email'}</small>
          </td>
          <td>${orden.telefono}</td>
          <td>${orden.ticket_id || orden.tickets || 'N/A'}</td>
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
      '<tr><td colspan="10" class="text-center text-danger">Error cargando órdenes</td></tr>';
  }
}