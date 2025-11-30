// En la función cargarOrdenes(), cambiar esta parte:
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