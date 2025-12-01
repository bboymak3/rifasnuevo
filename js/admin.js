document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Panel Admin cargado');
  cargarPanelAdmin();
});

async function cargarPanelAdmin() {
  console.log('🔄 Cargando panel admin completo...');
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
    console.log('🔧 Cargando solicitudes de recarga...');
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/solicitudes-recarga`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tabla = document.getElementById('tablaSolicitudesRecarga');
    
    console.log('📦 Solicitudes recibidas:', data);
    
    if (data.success) {
      if (!data.data.solicitudes || data.data.solicitudes.length === 0) {
        tabla.innerHTML = '<tr><td colspan="9" class="text-center">No hay solicitudes de recarga</td></tr>';
        return;
      }
      
      tabla.innerHTML = data.data.solicitudes.map(solicitud => `
        <tr>
          <td><small>${solicitud.id}</small></td>
          <td>
            <strong>${solicitud.usuario_nombre || 'N/A'}</strong><br>
            <small class="text-muted">${solicitud.usuario_email || 'Sin email'}</small><br>
            <small class="text-muted">${solicitud.usuario_telefono || 'Sin teléfono'}</small>
          </td>
          <td>Bs. ${solicitud.monto || 0}</td>
          <td>${solicitud.creditos_solicitados || Math.floor(((solicitud.monto || 0) * 100) / 250)} créditos</td>
          <td>${solicitud.metodo_pago || 'N/A'}</td>
          <td><code>${solicitud.referencia_pago || 'N/A'}</code></td>
          <td>
            <span class="badge ${getBadgeClassRecarga(solicitud.estado)}">
              ${solicitud.estado || 'pendiente'}
            </span>
          </td>
          <td>${solicitud.fecha_solicitud ? new Date(solicitud.fecha_solicitud).toLocaleString() : 'N/A'}</td>
          <td>
            ${(solicitud.estado === 'pendiente' || !solicitud.estado) ? `
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
      '<tr><td colspan="9" class="text-center text-danger">Error cargando solicitudes: ' + error.message + '</td></tr>';
  }
}

// Función para procesar recargas (CORREGIDA - usa /api/procesar-recarga)
async function procesarRecarga(recargaId, accion) {
  console.log(`🔧 Procesando recarga ${recargaId} - Acción: ${accion}`);
  
  if (!confirm(`¿Estás seguro de ${accion === 'aprobada' ? 'aprobar' : 'rechazar'} esta recarga?`)) {
    return;
  }

  try {
    const API_BASE_URL = window.location.origin;
    
    // IMPORTANTE: Usar el endpoint correcto
    const response = await fetch(`${API_BASE_URL}/api/procesar-recarga`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        recargaId: recargaId, 
        accion: accion,
        adminId: 1
      })
    });

    console.log('📊 Status:', response.status, response.statusText);
    
    // Manejar respuesta
    const text = await response.text();
    console.log('📦 Respuesta:', text || '(vacía)');
    
    if (!text) {
      throw new Error('Respuesta vacía del servidor');
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.error('❌ Error parseando JSON:', e);
      throw new Error(`Respuesta inválida: ${text.substring(0, 100)}`);
    }
    
    if (data.success) {
      alert(`✅ Recarga ${accion === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`);
      cargarSolicitudesRecarga(); // Recargar tabla
    } else {
      alert(`❌ Error: ${data.error || 'Error desconocido'}`);
    }
    
  } catch (error) {
    console.error('❌ Error procesando recarga:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

// Función para cargar configuración de tasas (CORREGIDA DEFINITIVAMENTE)
async function cargarConfigTasas() {
  console.log('🔧 Cargando configuración de tasas...');
  
  try {
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/config-tasas`);
    
    console.log('📊 Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const text = await response.text();
    console.log('📦 Texto recibido:', text.substring(0, 300) + '...');
    
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.error('❌ Error parseando JSON:', e);
      throw new Error('Respuesta no es JSON válido');
    }
    
    console.log('📊 Estructura de data:', data);
    
    // Verificar estructura
    if (!data || typeof data !== 'object') {
      throw new Error('Respuesta inválida del servidor');
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Error del servidor');
    }
    
    if (!data.data || !data.data.tasas || !Array.isArray(data.data.tasas)) {
      console.warn('⚠️ Estructura inesperada, data.data.tasas:', data.data?.tasas);
      throw new Error('Estructura de datos incorrecta');
    }
    
    const tasasArray = data.data.tasas;
    console.log(`✅ Se encontraron ${tasasArray.length} tasas`);
    
    // Mostrar en tabla
    const tabla = document.getElementById('tablaConfigTasas');
    if (!tabla) {
      console.error('❌ No se encontró tablaConfigTasas en el DOM');
      return;
    }
    
    if (tasasArray.length === 0) {
      tabla.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay tasas configuradas</td></tr>';
      return;
    }
    
    // Generar HTML
    const filasHTML = tasasArray.map(tasa => {
      const tipo = tasa.tipo || 'desconocido';
      const valor = tasa.valor || 0;
      const descripcion = tasa.descripcion || 'Sin descripción';
      const fecha = tasa.fecha_actualizacion 
        ? new Date(tasa.fecha_actualizacion).toLocaleString() 
        : 'N/A';
      
      // Escapar comillas simples para el onclick
      const descripcionSegura = descripcion.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      
      return `
      <tr>
        <td><strong>${tipo.replace(/_/g, ' ').toUpperCase()}</strong></td>
        <td>${descripcion}</td>
        <td><span class="badge bg-primary">${valor}</span></td>
        <td>${fecha}</td>
        <td>
          <button class="btn btn-sm btn-warning" 
            onclick="editarTasa('${tipo}', ${valor}, '${descripcionSegura}')">
            ✏️ Editar
          </button>
        </td>
      </tr>`;
    }).join('');
    
    tabla.innerHTML = filasHTML;
    console.log('✅ Tabla de tasas actualizada correctamente');
    
  } catch (error) {
    console.error('❌ Error en cargarConfigTasas:', error);
    console.error('❌ Stack trace:', error.stack);
    
    const tabla = document.getElementById('tablaConfigTasas');
    if (tabla) {
      tabla.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger">
            <strong>Error cargando tasas:</strong> ${error.message}
          </td>
        </tr>`;
    }
  }
}

// Función para editar tasa (CORREGIDA)
function editarTasa(tipo, valorActual, descripcion) {
  console.log(`🔧 Iniciando editarTasa:`, { tipo, valorActual });
  
  const tipoMostrar = tipo.replace(/_/g, ' ').toUpperCase();
  const nuevoValor = prompt(
    `Editar ${tipoMostrar}\n\n` +
    `Descripción: ${descripcion}\n` +
    `Valor actual: ${valorActual}\n\n` +
    `Ingresa el nuevo valor:`,
    valorActual
  );
  
  if (nuevoValor === null) {
    console.log('⚠️ Usuario canceló la edición');
    return;
  }
  
  const valorNumerico = parseFloat(nuevoValor);
  if (isNaN(valorNumerico)) {
    alert('❌ Por favor ingresa un valor numérico válido');
    return;
  }
  
  if (valorNumerico <= 0) {
    alert('❌ El valor debe ser mayor a 0');
    return;
  }
  
  console.log(`✅ Nuevo valor confirmado: ${valorNumerico}`);
  actualizarTasa(tipo, valorNumerico);
}

// Función para actualizar tasa en el servidor
async function actualizarTasa(tipo, nuevoValor) {
  try {
    console.log(`🔄 Actualizando tasa ${tipo} a ${nuevoValor}`);
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

    console.log('📊 Respuesta status:', response.status);
    
    const text = await response.text();
    console.log('📦 Respuesta raw:', text);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError);
      throw new Error('Respuesta no es JSON: ' + text.substring(0, 100));
    }

    if (data.success) {
      alert('✅ Tasa actualizada correctamente');
      cargarConfigTasas(); // Recargar la tabla
    } else {
      alert('❌ Error: ' + data.error);
    }
  } catch (error) {
    console.error('❌ Error actualizando tasa:', error);
    alert('❌ Error al actualizar la tasa: ' + error.message);
  }
}

function getBadgeClassRecarga(estado) {
  switch(estado) {
    case 'aprobada': return 'badge-verificado';
    case 'rechazada': return 'badge-rechazado';
    default: return 'badge-pendiente';
  }
}

// Auto-refresh cada 30 segundos
setInterval(() => {
  console.log('🔄 Auto-refresh del panel admin...');
  cargarPanelAdmin();
}, 30000);