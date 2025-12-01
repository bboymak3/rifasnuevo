const CONFIG = {
  precioTicket: 499.00,
  rifaId: 140
};

let estadoCompra = {
  tickets: [],
  cantidad: 0,
  total: 0
};

// Variables globales para créditos
let precioTicketCreditos = 100; // Valor por defecto, se actualizará desde la BD
let usuarioLogueado = null;

document.addEventListener('DOMContentLoaded', function() {
  cargarDatosCompra();
  configurarFormulario();
  configurarMetodoPago();
});

// Modificar cargarDatosCompra para verificar usuario
async function cargarDatosCompra() {
  const urlParams = new URLSearchParams(window.location.search);
  const ticketsParam = urlParams.get('tickets');
  const totalParam = urlParams.get('total');

  if (ticketsParam) {
    estadoCompra.tickets = ticketsParam.split(',').map(num => parseInt(num));
  } else {
    const savedTickets = sessionStorage.getItem('ticketsSeleccionados');
    const savedTotal = sessionStorage.getItem('totalPago');
    
    if (savedTickets) {
      estadoCompra.tickets = JSON.parse(savedTickets);
      estadoCompra.total = parseFloat(savedTotal);
    }
  }

  if (totalParam) {
    estadoCompra.total = parseFloat(totalParam);
  }

  estadoCompra.cantidad = estadoCompra.tickets.length;
  
  if (!estadoCompra.total) {
    estadoCompra.total = estadoCompra.cantidad * CONFIG.precioTicket;
  }

  // Verificar si hay usuario logueado
  await verificarUsuarioLogueado();
  mostrarResumenCompra();
}

// Verificar usuario logueado
async function verificarUsuarioLogueado() {
  const savedUser = localStorage.getItem('casinoUser');
  if (savedUser) {
    usuarioLogueado = JSON.parse(savedUser);
    
    // Obtener precio actual de tickets en créditos
    try {
      const response = await fetch('/api/config-tasas');
      const data = await response.json();
      
      if (data.success) {
        const tasaRifa = data.data.tasas.find(t => t.tipo === 'rifa_ticket');
        if (tasaRifa) {
          precioTicketCreditos = tasaRifa.valor;
        }
        
        // Actualizar información en la UI
        actualizarInfoCreditos();
      }
    } catch (error) {
      console.error('Error cargando tasas:', error);
    }
  }
}

// Actualizar información de créditos en la UI
function actualizarInfoCreditos() {
  if (usuarioLogueado) {
    const totalCreditos = estadoCompra.cantidad * precioTicketCreditos;
    
    // Mostrar saldo del usuario
    const saldoElement = document.getElementById('saldoUsuario');
    if (saldoElement) {
      saldoElement.textContent = usuarioLogueado.creditos.toLocaleString();
    }
    
    // Mostrar total de créditos necesarios
    const totalCreditosElement = document.getElementById('totalCreditos');
    if (totalCreditosElement) {
      totalCreditosElement.textContent = totalCreditos.toLocaleString();
    }
    
    // Mostrar información de conversión
    const infoConversion = document.getElementById('infoConversion');
    if (infoConversion) {
      infoConversion.textContent = `1 ticket = ${precioTicketCreditos} créditos`;
    }
    
    // Verificar si tiene saldo suficiente
    const creditoRadio = document.querySelector('input[value="creditos"]');
    if (creditoRadio) {
      if (usuarioLogueado.creditos >= totalCreditos) {
        creditoRadio.disabled = false;
      } else {
        creditoRadio.disabled = true;
        if (creditoRadio.checked) {
          seleccionarMetodo('pago_movil'); // Cambiar a otro método si estaba seleccionado
        }
      }
    }
  } else {
    const creditoRadio = document.querySelector('input[value="creditos"]');
    if (creditoRadio) {
      creditoRadio.disabled = true;
    }
  }
}

function mostrarResumenCompra() {
  document.getElementById('resumenCantidad').textContent = estadoCompra.cantidad;
  document.getElementById('resumenTotal').textContent = estadoCompra.total.toFixed(2);

  const ticketsResumen = document.getElementById('resumenTickets');
  ticketsResumen.innerHTML = '';
  
  estadoCompra.tickets.forEach(numero => {
    const badge = document.createElement('span');
    badge.className = 'ticket-badge';
    badge.textContent = numero;
    ticketsResumen.appendChild(badge);
  });
  
  // Actualizar información de créditos
  actualizarInfoCreditos();
}

function configurarMetodoPago() {
  document.querySelectorAll('.metodo-pago').forEach(div => {
    div.addEventListener('click', function() {
      const radio = this.querySelector('input[type="radio"]');
      if (!radio.disabled) {
        radio.checked = true;
        seleccionarMetodo(radio.value);
      }
    });
  });
}

function seleccionarMetodo(metodo) {
  document.querySelectorAll('.metodo-pago').forEach(div => {
    div.classList.remove('selected');
  });
  
  document.querySelectorAll('.info-pago').forEach(div => {
    div.style.display = 'none';
  });

  const divSeleccionado = document.querySelector(`input[value="${metodo}"]`).closest('.metodo-pago');
  divSeleccionado.classList.add('selected');
  
  const infoDiv = document.getElementById(`info${metodo.charAt(0).toUpperCase() + metodo.slice(1)}`);
  if (infoDiv) {
    infoDiv.style.display = 'block';
  }
}

function configurarFormulario() {
  document.getElementById('formCompra').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validarFormulario()) return;
    await procesarPago();
  });
}

// Modificar validarFormulario para incluir créditos
function validarFormulario() {
  const telefono = document.getElementById('telefono').value.trim();
  const nombre = document.getElementById('nombre').value.trim();
  const metodoPago = document.querySelector('input[name="metodoPago"]:checked');

  if (!telefono || !nombre) {
    alert('⚠️ Completa todos los campos obligatorios');
    return false;
  }

  if (!metodoPago) {
    alert('⚠️ Selecciona un método de pago');
    return false;
  }

  let comprobante = '';
  
  // Validación específica para cada método
  if (metodoPago.value === 'transferencia') {
    comprobante = document.getElementById('comprobanteTransferencia').value.trim();
    if (!comprobante) {
      alert('⚠️ Ingresa el número de comprobante de transferencia');
      return false;
    }
  } else if (metodoPago.value === 'pago_movil') {
    comprobante = document.getElementById('comprobantePagoMovil').value.trim();
    if (!comprobante) {
      alert('⚠️ Ingresa el número de referencia de pago móvil');
      return false;
    }
  } else if (metodoPago.value === 'creditos') {
    if (!usuarioLogueado) {
      alert('⚠️ Debes iniciar sesión para pagar con créditos');
      return false;
    }
    
    const password = document.getElementById('passwordCreditos').value.trim();
    if (!password) {
      alert('⚠️ Ingresa tu contraseña para confirmar el pago con créditos');
      return false;
    }
    
    const totalCreditos = estadoCompra.cantidad * precioTicketCreditos;
    if (usuarioLogueado.creditos < totalCreditos) {
      alert('⚠️ No tienes suficientes créditos para esta compra');
      return false;
    }
  }

  return true;
}

// Modificar procesarPago para manejar créditos
async function procesarPago() {
  const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;
  let comprobante = '';
  let password = '';

  if (metodoPago === 'transferencia') {
    comprobante = document.getElementById('comprobanteTransferencia').value;
  } else if (metodoPago === 'pago_movil') {
    comprobante = document.getElementById('comprobantePagoMovil').value;
  } else if (metodoPago === 'creditos') {
    password = document.getElementById('passwordCreditos').value;
    
    // Verificar contraseña
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: usuarioLogueado.email,
          password: password
        })
      });
      
      const data = await response.json();
      if (!data.success) {
        alert('❌ Contraseña incorrecta');
        const btn = document.querySelector('#formCompra button[type="submit"]');
        btn.innerHTML = '✅ Confirmar y Procesar Pago';
        btn.disabled = false;
        return;
      }
    } catch (error) {
      alert('❌ Error verificando contraseña');
      const btn = document.querySelector('#formCompra button[type="submit"]');
      btn.innerHTML = '✅ Confirmar y Procesar Pago';
      btn.disabled = false;
      return;
    }
  }

  const formData = {
    rifaId: CONFIG.rifaId,
    tickets: estadoCompra.tickets,
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    email: document.getElementById('email').value.trim() || '',
    metodoPago: metodoPago,
    comprobante: comprobante,
    password: password,
    total: estadoCompra.total,
    usuarioId: usuarioLogueado ? usuarioLogueado.id : null,
    pagoConCreditos: metodoPago === 'creditos',
    creditosUtilizados: metodoPago === 'creditos' ? estadoCompra.cantidad * precioTicketCreditos : 0
  };

  try {
    const btn = document.querySelector('#formCompra button[type="submit"]');
    btn.innerHTML = '🔄 PROCESANDO...';
    btn.disabled = true;

    const response = await fetch('/api/procesar-pago', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      sessionStorage.removeItem('ticketsSeleccionados');
      sessionStorage.removeItem('totalPago');
      
      // Si pagó con créditos, actualizar saldo local
      if (metodoPago === 'creditos' && usuarioLogueado) {
        usuarioLogueado.creditos -= formData.creditosUtilizados;
        localStorage.setItem('casinoUser', JSON.stringify(usuarioLogueado));
      }
      
      window.location.href = `/compra-exitosa.html?order=${data.orderId}`;
    } else {
      alert('❌ Error: ' + data.error);
      btn.innerHTML = '✅ Confirmar y Procesar Pago';
      btn.disabled = false;
    }
  } catch (error) {
    alert('❌ Error de conexión. Por favor, intenta nuevamente.');
    const btn = document.querySelector('#formCompra button[type="submit"]');
    btn.innerHTML = '✅ Confirmar y Procesar Pago';
    btn.disabled = false;
  }
}