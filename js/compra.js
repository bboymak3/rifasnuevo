 
const CONFIG = {
  precioTicket: 499.00,
  rifaId: 140
};

let estadoCompra = {
  tickets: [],
  cantidad: 0,
  total: 0
};

document.addEventListener('DOMContentLoaded', function() {
  cargarDatosCompra();
  configurarFormulario();
  configurarMetodoPago();
});

function cargarDatosCompra() {
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

  mostrarResumenCompra();
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
}

function configurarMetodoPago() {
  document.querySelectorAll('.metodo-pago').forEach(div => {
    div.addEventListener('click', function() {
      const radio = this.querySelector('input[type="radio"]');
      radio.checked = true;
      seleccionarMetodo(radio.value);
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
  }

  return true;
}

async function procesarPago() {
  const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;
  let comprobante = '';

  if (metodoPago === 'transferencia') {
    comprobante = document.getElementById('comprobanteTransferencia').value;
  } else if (metodoPago === 'pago_movil') {
    comprobante = document.getElementById('comprobantePagoMovil').value;
  }

  const formData = {
    rifaId: CONFIG.rifaId,
    tickets: estadoCompra.tickets,
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    email: document.getElementById('email').value.trim() || '',
    metodoPago: metodoPago,
    comprobante: comprobante,
    total: estadoCompra.total
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