﻿﻿document.addEventListener('DOMContentLoaded', function() {
  cargarPanelAdmin();
});

async function cargarPanelAdmin() {
  await cargarEstadisticas();
  await cargarTicketsVendidos();
  await cargarOrdenes();
  await cargarSolicitudesRecarga();
  await cargarConfigTasas();
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
      // 🔍 DEBUG: VER QUÉ CAMPOS LLEGAN REALMENTE
      console.log('=== DEBUG - ESTRUCTURA DE DATOS ===');
      if (data.data.ordenes.length > 0) {
        console.log('Primera orden completa:', data.data.ordenes[0]);
        console.log('Campos disponibles:', Object.keys(data.data.ordenes[0]));
        console.log('Valor de tickets:', data.data.ordenes[0].tickets);
        console.log('Valor de ticket_id:', data.data.ordenes[0].ticket_id);
      }
      console.log('=== FIN DEBUG ===');
      
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
              ${orden.tickets || orden.ticket_id || 'N/A'}
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

// Función para cargar solicitudes de recarga
async function cargarSolicitudesRecarga() {
  try {
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/solicitudes-recarga`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tabla = document.getElementById('tablaSolicitudesRecarga');
    
    if (data.success) {
      if (data.data.solicitudes.length === 0) {
        tabla.innerHTML = '<tr><td colspan="9" class="text-center">No hay solicitudes de recarga</td></tr>';
        return;
      }
      
      tabla.innerHTML = data.data.solicitudes.map(solicitud => `
        <tr>
          <td><small>${solicitud.id}</small></td>
          <td>
            <strong>${solicitud.usuario_nombre}</strong><br>
            <small class="text-muted">${solicitud.usuario_email}</small><br>
            <small class="text-muted">${solicitud.usuario_telefono || 'Sin teléfono'}</small>
          </td>
          <td>Bs. ${solicitud.monto}</td>
          <td>${solicitud.creditos_solicitados || Math.floor((solicitud.monto * 100) / 250)} créditos</td>
          <td>${solicitud.metodo_pago}</td>
          <td><code>${solicitud.referencia_pago || 'N/A'}</code></td>
          <td>
            <span class="badge ${getBadgeClassRecarga(solicitud.estado)}">
              ${solicitud.estado}
            </span>
          </td>
          <td>${new Date(solicitud.fecha_solicitud).toLocaleString()}</td>
          <td>
            ${solicitud.estado === 'pendiente' ? `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-success" onclick="procesarRecarga(${solicitud.id}, 'aprobada')">
                  ✅ Aprobar
                </button>
                <button class="btn btn-danger" onclick="procesarRecarga(${solicitud.id}, 'rechazada')">
                  ❌ Rechazar
                </button>
              </div>
            ` : `
              <small class="text-muted">Procesada</small><br>
              <small>${solicitud.fecha_procesado ? new Date(solicitud.fecha_procesado).toLocaleDateString() : 'N/A'}</small>
            `}
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error cargando solicitudes de recarga:', error);
    document.getElementById('tablaSolicitudesRecarga').innerHTML = 
      '<tr><td colspan="9" class="text-center text-danger">Error cargando solicitudes</td></tr>';
  }
}

// Función para procesar recargas (aprobar/rechazar)
async function procesarRecarga(recargaId, accion) {
  if (!confirm(`¿Estás seguro de ${accion === 'aprobada' ? 'aprobar' : 'rechazar'} esta recarga?`)) {
    return;
  }

  try {
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/procesar-recarga`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        recargaId: recargaId, 
        accion: accion,
        adminId: 1 // En una app real, usarías el ID del admin logueado
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        alert(`✅ Recarga ${accion === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`);
        cargarSolicitudesRecarga(); // Recargar la tabla
      } else {
        alert('❌ Error: ' + data.error);
      }
    } else {
      throw new Error(`Error ${response.status}`);
    }
  } catch (error) {
    console.error('Error procesando recarga:', error);
    alert('❌ Error al procesar la recarga');
  }
}

// Función para cargar configuración de tasas
async function cargarConfigTasas() {
  try {
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/config-tasas`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tabla = document.getElementById('tablaConfigTasas');
    
    if (data.success) {
      if (data.data.tasas.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center">No hay configuración de tasas</td></tr>';
        return;
      }
      
      tabla.innerHTML = data.data.tasas.map(tasa => `
        <tr>
          <td>
            <strong>${tasa.tipo.replace(/_/g, ' ').toUpperCase()}</strong>
          </td>
          <td>${tasa.descripcion || 'Sin descripción'}</td>
          <td>
            <span class="badge bg-primary">${tasa.valor}</span>
          </td>
          <td>${new Date(tasa.fecha_actualizacion).toLocaleString()}</td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="editarTasa('${tasa.tipo}', ${tasa.valor}, '${tasa.descripcion || ''}')">
              ✏️ Editar
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error cargando configuración de tasas:', error);
    document.getElementById('tablaConfigTasas').innerHTML = 
      '<tr><td colspan="5" class="text-center text-danger">Error cargando configuración</td></tr>';
  }
}

// Función para editar tasa
function editarTasa(tipo, valorActual, descripcion) {
  const nuevoValor = prompt(`Editar ${tipo.replace(/_/g, ' ').toUpperCase()}\n\nDescripción: ${descripcion}\nValor actual: ${valorActual}\n\nIngresa el nuevo valor:`, valorActual);
  
  if (nuevoValor === null) return; // Usuario canceló
  
  const valorNumerico = parseFloat(nuevoValor);
  if (isNaN(valorNumerico)) {
    alert('❌ Por favor ingresa un valor numérico válido');
    return;
  }
  
  if (valorNumerico <= 0) {
    alert('❌ El valor debe ser mayor a 0');
    return;
  }
  
  actualizarTasa(tipo, valorNumerico);
}

// Función para actualizar tasa en el servidor
async function actualizarTasa(tipo, nuevoValor) {
  try {
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/actualizar-tasa`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        tipo: tipo, 
        nuevoValor: nuevoValor
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        alert('✅ Tasa actualizada correctamente');
        cargarConfigTasas(); // Recargar la tabla
      } else {
        alert('❌ Error: ' + data.error);
      }
    } else {
      throw new Error(`Error ${response.status}`);
    }
  } catch (error) {
    console.error('Error actualizando tasa:', error);
    alert('❌ Error al actualizar la tasa');
  }
}

function getBadgeClassRecarga(estado) {
  switch(estado) {
    case 'aprobada': return 'badge-verificado';
    case 'rechazada': return 'badge-rechazado';
    default: return 'badge-pendiente';
  }
}

setInterval(() => {
  cargarPanelAdmin();
}, 30000);