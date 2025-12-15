document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Panel Admin cargado - VERSIÓN CORREGIDA');
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
    console.log('📊 Cargando estadísticas...');
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/estadisticas`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('ticketsVendidos').textContent = data.data.vendidos || 0;
      document.getElementById('ticketsDisponibles').textContent = data.data.disponibles || 0;
      document.getElementById('totalRecaudado').textContent = `Bs. ${(data.data.recaudado || 0).toFixed(2)}`;
      document.getElementById('totalOrdenes').textContent = data.data.totalOrdenes || 0;
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

async function cargarTicketsVendidos() {
  try {
    console.log('🎫 Cargando tickets vendidos...');
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/tickets-vendidos`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const container = document.getElementById('listaTicketsVendidos');
    
    if (data.success) {
      if (!data.data.tickets || data.data.tickets.length === 0) {
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
    const container = document.getElementById('listaTicketsVendidos');
    if (container) {
      container.innerHTML = '<p class="text-center text-danger">Error cargando tickets</p>';
    }
  }
}

async function cargarOrdenes() {
  try {
    console.log('📋 Cargando órdenes...');
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/ordenes`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tabla = document.getElementById('tablaOrdenes');
    
    if (!tabla) {
      console.error('❌ No se encontró tablaOrdenes');
      return;
    }
    
    if (data.success) {
      if (!data.data.ordenes || data.data.ordenes.length === 0) {
        tabla.innerHTML = '<tr><td colspan="9" class="text-center">No hay órdenes registradas</td></tr>';
        return;
      }
      
      tabla.innerHTML = data.data.ordenes.map(orden => `
        <tr>
          <td><small>${orden.id}</small></td>
          <td>
            <strong>${orden.nombre || 'N/A'}</strong><br>
            <small class="text-muted">${orden.email || 'Sin email'}</small>
          </td>
          <td>${orden.telefono || 'N/A'}</td>
          <td>
            <small>
              ${orden.tickets || orden.ticket_id || 'N/A'}
            </small>
          </td>
          <td>Bs. ${orden.total || 0}</td>
          <td>${orden.metodo_pago || 'N/A'}</td>
          <td>
            <span class="badge ${getBadgeClass(orden.estado)}">
              ${orden.estado || 'pendiente'}
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
          <td>${orden.fecha_creacion ? new Date(orden.fecha_creacion).toLocaleString() : 'N/A'}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error cargando órdenes:', error);
    const tabla = document.getElementById('tablaOrdenes');
    if (tabla) {
      tabla.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error cargando órdenes</td></tr>';
    }
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
    console.log(`🔄 Cambiando estado orden ${ordenId} a ${nuevoEstado}`);
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
    console.log('💰 Cargando solicitudes de recarga...');
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/solicitudes-recarga`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tabla = document.getElementById('tablaSolicitudesRecarga');
    
    if (!tabla) {
      console.error('❌ No se encontró tablaSolicitudesRecarga');
      return;
    }
    
    console.log('📦 Datos recibidos:', data);
    
    if (data.success) {
      const solicitudes = data.data?.solicitudes || [];
      
      if (solicitudes.length === 0) {
        tabla.innerHTML = '<tr><td colspan="9" class="text-center">No hay solicitudes de recarga</td></tr>';
        return;
      }
      
      tabla.innerHTML = solicitudes.map(solicitud => `
        <tr>
          <td><small>${solicitud.id}</small></td>
          <td>
            <strong>${solicitud.usuario_nombre || 'N/A'}</strong><br>
            <small class="text-muted">${solicitud.usuario_email || 'Sin email'}</small><br>
            <small class="text-muted">${solicitud.usuario_telefono || 'Sin teléfono'}</small>
          </td>
          <td>Bs. ${solicitud.monto || 0}</td>
          <td>${Math.floor(((solicitud.monto || 0) * 100) / 250)} créditos</td>
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
    } else {
      tabla.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error: ' + (data.error || 'Desconocido') + '</td></tr>';
    }
  } catch (error) {
    console.error('Error cargando solicitudes de recarga:', error);
    const tabla = document.getElementById('tablaSolicitudesRecarga');
    if (tabla) {
      tabla.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
    }
  }
}

// Función para procesar recargas
async function procesarRecarga(recargaId, accion) {
  console.log(`🔄 Procesando recarga ${recargaId} - Acción: ${accion}`);
  
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
        adminId: 1
      })
    });

    console.log('📊 Status:', response.status);
    
    const text = await response.text();
    console.log('📦 Respuesta:', text);
    
    if (!text) {
      throw new Error('Respuesta vacía del servidor');
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.error('❌ Error parseando JSON:', e);
      throw new Error('Respuesta inválida del servidor');
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

// ⭐⭐ FUNCIÓN CARGA TASAS - VERSIÓN DEFINITIVA ⭐⭐
async function cargarConfigTasas() {
  console.log('⚙️ Cargando configuración de tasas...');
  
  try {
    const API_BASE_URL = window.location.origin;
    const response = await fetch(`${API_BASE_URL}/api/config-tasas`);
    
    console.log('📊 Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const text = await response.text();
    console.log('📦 Respuesta recibida (primeros 200 chars):', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.error('❌ Error parseando JSON:', e);
      throw new Error('Respuesta no es JSON válido: ' + e.message);
    }
    
    console.log('📊 Estructura de data:', data);
    
    // VALIDACIÓN PASO A PASO
    if (!data) {
      throw new Error('Respuesta vacía del servidor');
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Error del servidor');
    }
    
    if (!data.data) {
      throw new Error('No se encontró data en la respuesta');
    }
    
    const tasas = data.data.tasas;
    
    // ESTA ES LA LÍNEA IMPORTANTE - Verificar si tasas existe
    if (!tasas) {
      console.warn('⚠️ data.data.tasas es undefined o null');
      console.log('data.data =', data.data);
      throw new Error('No se encontró el campo "tasas" en la respuesta');
    }
    
    if (!Array.isArray(tasas)) {
      console.warn('⚠️ data.data.tasas no es un array:', typeof tasas, tasas);
      throw new Error('El campo "tasas" no es un array');
    }
    
    console.log(`✅ Se encontraron ${tasas.length} tasas`);
    
    const tabla = document.getElementById('tablaConfigTasas');
    if (!tabla) {
      console.error('❌ No se encontró tablaConfigTasas en el DOM');
      return;
    }
    
    if (tasas.length === 0) {
      tabla.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay tasas configuradas</td></tr>';
      return;
    }
    
    // Generar HTML
    const filasHTML = tasas.map(tasa => {
      const tipo = tasa.tipo || 'desconocido';
      const valor = tasa.valor || 0;
      const descripcion = tasa.descripcion || 'Sin descripción';
      const fecha = tasa.fecha_actualizacion 
        ? new Date(tasa.fecha_actualizacion).toLocaleString() 
        : 'N/A';
      
      // Escapar para HTML
      const descripcionSegura = descripcion.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
      
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
    console.error('❌ ERROR EN CARGAR CONFIG TASAS:', error);
    console.error('Stack trace:', error.stack);
    
    const tabla = document.getElementById('tablaConfigTasas');
    if (tabla) {
      tabla.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger">
            <strong>Error:</strong> ${error.message}
            <br><small>Ver consola para detalles</small>
          </td>
        </tr>`;
    }
  }
}

// Función para editar tasa
function editarTasa(tipo, valorActual, descripcion) {
  console.log(`✏️ Editando tasa: ${tipo}`);
  
  const tipoMostrar = tipo.replace(/_/g, ' ').toUpperCase();
  const nuevoValor = prompt(
    `Editar ${tipoMostrar}\n\n` +
    `Descripción: ${descripcion}\n` +
    `Valor actual: ${valorActual}\n\n` +
    `Ingresa el nuevo valor:`,
    valorActual
  );
  
  if (nuevoValor === null) {
    console.log('❌ Usuario canceló');
    return;
  }
  
  const valorNum = parseFloat(nuevoValor);
  if (isNaN(valorNum) || valorNum <= 0) {
    alert('❌ Ingresa un número válido mayor a 0');
    return;
  }
  
  console.log(`✅ Nuevo valor: ${valorNum}`);
  actualizarTasa(tipo, valorNum);
}

// Función para actualizar tasa
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

    console.log('📊 Status:', response.status);
    
    const text = await response.text();
    console.log('📦 Respuesta:', text);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.error('❌ Error parseando JSON:', e);
      throw new Error('Respuesta inválida: ' + text.substring(0, 100));
    }

    if (data.success) {
      alert('✅ Tasa actualizada correctamente');
      cargarConfigTasas(); // Recargar tabla
    } else {
      alert('❌ Error: ' + data.error);
    }
  } catch (error) {
    console.error('❌ Error actualizando tasa:', error);
    alert('❌ Error: ' + error.message);
  }
}

function getBadgeClassRecarga(estado) {
  switch(estado) {
    case 'aprobada': return 'badge-verificado';
    case 'rechazada': return 'badge-rechazado';
    default: return 'badge-pendiente';
  }
}

// Auto-refresh
setInterval(() => {
  console.log('🔄 Auto-refresh...');
  cargarPanelAdmin();
}, 30000);

// Función para sembrar tickets (1..100) desde el panel admin
async function sembrarTickets() {
  if (!confirm('¿Sembrar números de ticket del 1 al 100 en la base de datos? Esto solo insertará aquellos que no existan.')) return;
  try {
    const API_BASE_URL = window.location.origin;
    const res = await fetch(`${API_BASE_URL}/api/seed-tickets`, { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('✅ ' + (data.message || 'Tickets sembrados correctamente'));
      cargarEstadisticas();
      cargarTicketsVendidos();
    } else {
      alert('❌ Error: ' + (data.error || 'Desconocido'));
    }
  } catch (err) {
    console.error('Error sembrando tickets:', err);
    alert('❌ Error al sembrar tickets: ' + err.message);
  }
}

// Admin: Backup DB
async function backupDB() {
  if (!confirm('Descargar backup JSON de tablas (usuarios, recargas, tickets, ventas)?')) return;
  const token = prompt('Ingresa ADMIN_TOKEN (secreto)');
  if (!token) return alert('Se requiere ADMIN_TOKEN');

  try {
    const API_BASE_URL = window.location.origin;
    const res = await fetch(`${API_BASE_URL}/api/admin/backup`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!data.success) return alert('Error: ' + (data.error || 'Desconocido'));

    // Trigger download
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_db_${new Date().toISOString()}.json`; a.click();
    URL.revokeObjectURL(url);
    alert('Backup descargado');
  } catch (err) {
    console.error('Error backupDB:', err);
    alert('Error generando backup: ' + err.message);
  }
}

// Admin: Recreate DB (wipe)
async function recrearDB() {
  if (!confirm('Esto BORRARÁ los datos actuales y recreará el esquema. ¿Continuar?')) return;
  const token = prompt('Ingresa ADMIN_TOKEN (secreto)');
  if (!token) return alert('Se requiere ADMIN_TOKEN');
  const force = confirm('¿Forzar borrado incluso si ya existe esquema? (force=true)');

  try {
    const API_BASE_URL = window.location.origin;
    const res = await fetch(`${API_BASE_URL}/api/admin/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'recreate', force: force, seed: true })
    });
    const data = await res.json();
    if (data.success) {
      alert('Recreación completada: ' + (data.message || 'OK'));
      cargarPanelAdmin();
    } else {
      alert('Error: ' + (data.error || 'Desconocido'));
      console.error('RecrearDB failed:', data);
    }
  } catch (err) {
    console.error('Error recrearDB:', err);
    alert('Error: ' + err.message);
  }
}