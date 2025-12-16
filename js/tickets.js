// tickets.js - Funciones específicas para manejo de tickets

// Variables globales
let ticketsCache = [];
let selectedTicketsList = [];
let currentTicketPrice = 10;
let userBalance = 0;

// Inicializar sistema de tickets
async function initTicketsSystem() {
    try {
        // Cargar configuración
        const config = await obtenerUno("SELECT precio_ticket FROM system_config WHERE id = 1");
        if (config) {
            currentTicketPrice = config.precio_ticket;
        }
        
        // Cargar tickets
        await refreshTickets();
        
        // Cargar datos del usuario
        const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
        if (usuario) {
            userBalance = usuario.puntos;
            updateUserInfo(usuario);
        }
        
        return true;
    } catch (error) {
        console.error('Error al inicializar sistema de tickets:', error);
        return false;
    }
}

// Refrescar lista de tickets
async function refreshTickets() {
    try {
        ticketsCache = await obtenerDatos(`
            SELECT numero, estado, user_id 
            FROM tickets 
            ORDER BY numero
        `);
        
        return ticketsCache;
    } catch (error) {
        console.error('Error al refrescar tickets:', error);
        return [];
    }
}

// Renderizar grid de tickets
function renderTicketsGrid(containerId, filter = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    ticketsCache.forEach(ticket => {
        const ticketElement = createTicketElement(ticket, filter);
        container.appendChild(ticketElement);
    });
}

// Crear elemento de ticket individual
function createTicketElement(ticket, filter) {
    const div = document.createElement('div');
    div.className = `ticket ticket-${ticket.estado}`;
    div.dataset.numero = ticket.numero;
    div.dataset.estado = ticket.estado;
    
    // Verificar si está seleccionado
    if (selectedTicketsList.includes(ticket.numero)) {
        div.classList.add('selected');
    }
    
    let statusText = '';
    let statusClass = '';
    
    switch(ticket.estado) {
        case 'disponible':
            statusText = 'DISPONIBLE';
            statusClass = 'available';
            break;
        case 'vendido':
            statusText = 'VENDIDO';
            statusClass = 'sold';
            break;
        case 'reservado':
            statusText = 'RESERVADO';
            statusClass = 'reserved';
            break;
    }
    
    div.innerHTML = `
        <div class="ticket-number">${ticket.numero}</div>
        <div class="ticket-status ${statusClass}">${statusText}</div>
    `;
    
    // Solo agregar evento si está disponible
    if (ticket.estado === 'disponible') {
        div.addEventListener('click', () => toggleTicketSelection(ticket.numero));
    }
    
    // Aplicar filtro
    if (filter !== 'all') {
        if (filter === 'available' && ticket.estado !== 'disponible') {
            div.style.display = 'none';
        } else if (filter === 'sold' && ticket.estado !== 'vendido') {
            div.style.display = 'none';
        } else if (filter === 'reserved' && ticket.estado !== 'reservado') {
            div.style.display = 'none';
        } else if (filter === 'selected' && !div.classList.contains('selected')) {
            div.style.display = 'none';
        }
    }
    
    return div;
}

// Alternar selección de ticket
function toggleTicketSelection(ticketNumber) {
    const index = selectedTicketsList.indexOf(ticketNumber);
    
    if (index === -1) {
        // Verificar puntos suficientes
        const newTotal = (selectedTicketsList.length + 1) * currentTicketPrice;
        if (newTotal > userBalance) {
            showNotification('No tienes puntos suficientes', 'warning');
            return;
        }
        selectedTicketsList.push(ticketNumber);
    } else {
        selectedTicketsList.splice(index, 1);
    }
    
    updateSelectionSummary();
}

// Actualizar resumen de selección
function updateSelectionSummary() {
    const selectedCount = selectedTicketsList.length;
    const totalCost = selectedCount * currentTicketPrice;
    const remainingBalance = userBalance - totalCost;
    
    // Actualizar elementos UI si existen
    const selectedCountElem = document.getElementById('selectedCount');
    const totalCostElem = document.getElementById('totalCost');
    const remainingBalanceElem = document.getElementById('remainingBalance');
    const buyButton = document.getElementById('buyButton');
    
    if (selectedCountElem) selectedCountElem.textContent = selectedCount;
    if (totalCostElem) totalCostElem.textContent = `${totalCost} puntos`;
    if (remainingBalanceElem) remainingBalanceElem.textContent = `${remainingBalance} puntos`;
    if (buyButton) {
        buyButton.disabled = selectedCount === 0 || totalCost > userBalance;
        buyButton.textContent = selectedCount > 0 
            ? `Comprar ${selectedCount} ticket(s) - ${totalCost} pts` 
            : 'Comprar Tickets';
    }
    
    // Actualizar tickets seleccionados visualmente
    document.querySelectorAll('.ticket').forEach(ticket => {
        const num = parseInt(ticket.dataset.numero);
        if (selectedTicketsList.includes(num)) {
            ticket.classList.add('selected');
        } else {
            ticket.classList.remove('selected');
        }
    });
}

// Procesar compra de tickets
async function processTicketPurchase() {
    if (selectedTicketsList.length === 0) {
        showNotification('No hay tickets seleccionados', 'warning');
        return;
    }
    
    const usuario = JSON.parse(localStorage.getItem('usuarioRifa'));
    const totalCost = selectedTicketsList.length * currentTicketPrice;
    
    // Verificar puntos
    if (totalCost > usuario.puntos) {
        showNotification('Puntos insuficientes', 'error');
        return;
    }
    
    try {
        // Iniciar transacción
        const queries = [];
        
        // 1. Actualizar puntos del usuario
        queries.push(`
            UPDATE users 
            SET puntos = puntos - ${totalCost} 
            WHERE id = ${usuario.id}
        `);
        
        // 2. Actualizar cada ticket
        selectedTicketsList.forEach(numero => {
            queries.push(`
                UPDATE tickets 
                SET estado = 'vendido', 
                    user_id = ${usuario.id}, 
                    fecha_compra = CURRENT_TIMESTAMP 
                WHERE numero = ${numero}
            `);
        });
        
        // 3. Registrar transacción
        queries.push(`
            INSERT INTO transacciones (user_id, tipo, puntos, descripcion)
            VALUES (
                ${usuario.id},
                'compra',
                -${totalCost},
                'Compra de tickets: ${selectedTicketsList.sort((a,b) => a-b).join(', ')}'
            )
        `);
        
        // Ejecutar todas las queries
        for (const query of queries) {
            await ejecutarComando(query);
        }
        
        // Actualizar datos locales
        usuario.puntos -= totalCost;
        localStorage.setItem('usuarioRifa', JSON.stringify(usuario));
        userBalance = usuario.puntos;
        
        // Mostrar éxito
        showNotification(`✅ Compra exitosa! ${selectedTicketsList.length} ticket(s) adquiridos.`, 'success');
        
        // Limpiar selección y refrescar
        selectedTicketsList = [];
        await refreshTickets();
        updateSelectionSummary();
        
        // Si hay un callback de éxito, ejecutarlo
        if (typeof onPurchaseSuccess === 'function') {
            onPurchaseSuccess();
        }
        
    } catch (error) {
        console.error('Error en compra:', error);
        showNotification('❌ Error al procesar la compra', 'error');
    }
}

// Seleccionar tickets aleatorios
function selectRandomTickets(count) {
    const availableTickets = ticketsCache
        .filter(t => t.estado === 'disponible' && !selectedTicketsList.includes(t.numero))
        .map(t => t.numero);
    
    if (availableTickets.length < count) {
        showNotification(`Solo hay ${availableTickets.length} tickets disponibles`, 'warning');
        return;
    }
    
    // Seleccionar aleatorios
    const shuffled = [...availableTickets].sort(() => 0.5 - Math.random());
    const randomTickets = shuffled.slice(0, count);
    
    // Verificar puntos
    const newTotal = (selectedTicketsList.length + randomTickets.length) * currentTicketPrice;
    if (newTotal > userBalance) {
        showNotification('No tienes puntos suficientes', 'warning');
        return;
    }
    
    // Agregar a selección
    selectedTicketsList = [...selectedTicketsList, ...randomTickets];
    updateSelectionSummary();
    
    showNotification(`${count} tickets seleccionados aleatoriamente`, 'success');
}

// Limpiar selección
function clearTicketSelection() {
    selectedTicketsList = [];
    updateSelectionSummary();
    showNotification('Selección limpiada', 'info');
}

// Buscar ticket específico
function searchTicket(number) {
    const tickets = document.querySelectorAll('.ticket');
    let found = false;
    
    tickets.forEach(ticket => {
        const ticketNumber = parseInt(ticket.dataset.numero);
        if (ticketNumber === number) {
            ticket.scrollIntoView({ behavior: 'smooth', block: 'center' });
            ticket.style.animation = 'highlight 1s ease';
            setTimeout(() => ticket.style.animation = '', 1000);
            found = true;
        }
    });
    
    if (!found) {
        showNotification(`Ticket ${number} no encontrado`, 'warning');
    }
}

// Filtrar tickets
function filterTicketsView(filter) {
    const tickets = document.querySelectorAll('.ticket');
    
    tickets.forEach(ticket => {
        switch(filter) {
            case 'all':
                ticket.style.display = 'block';
                break;
            case 'available':
                ticket.style.display = ticket.dataset.estado === 'disponible' ? 'block' : 'none';
                break;
            case 'sold':
                ticket.style.display = ticket.dataset.estado === 'vendido' ? 'block' : 'none';
                break;
            case 'reserved':
                ticket.style.display = ticket.dataset.estado === 'reservado' ? 'block' : 'none';
                break;
            case 'selected':
                ticket.style.display = selectedTicketsList.includes(parseInt(ticket.dataset.numero)) ? 'block' : 'none';
                break;
        }
    });
}

// Actualizar información del usuario en UI
function updateUserInfo(usuario) {
    const userInfoElements = {
        'userName': usuario.nombre,
        'userPoints': `${usuario.puntos} puntos`,
        'userRole': usuario.role === 'admin' ? 'Administrador' : 'Usuario'
    };
    
    Object.keys(userInfoElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = userInfoElements[id];
        }
    });
    
    // Actualizar máximo de tickets que puede comprar
    const maxTickets = Math.floor(usuario.puntos / currentTicketPrice);
    const maxTicketsElem = document.getElementById('maxTickets');
    if (maxTicketsElem) {
        maxTicketsElem.textContent = maxTickets;
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-circle' : 
                          type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initTicketsSystem,
        refreshTickets,
        renderTicketsGrid,
        toggleTicketSelection,
        processTicketPurchase,
        selectRandomTickets,
        clearTicketSelection,
        searchTicket,
        filterTicketsView,
        updateUserInfo
    };
}