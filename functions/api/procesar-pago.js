// En procesar-pago.js, después de crear la orden:
const orden = await db.prepare(
  `INSERT INTO ordenes (ticket_id, cliente_nombre, cliente_telefono, cliente_email, rifa_id, estado)
   VALUES (?, ?, ?, ?, ?, 'pendiente')`
).bind(
  tickets.join(','),
  nombre, 
  telefono, 
  email || '', 
  parseInt(rifaId)
).run();

const ordenId = orden.meta.last_row_id;

// ✅ PRIMERO verificar que la orden se creó
const ordenCreada = await db.prepare('SELECT * FROM ordenes WHERE id = ?').bind(ordenId).first();
console.log('Orden creada:', ordenCreada);

// LUEGO actualizar los tickets
await db.prepare(
  `UPDATE tickets SET vendido = 1, order_id = ? WHERE numero IN (${placeholders})`
).bind(ordenId, ...tickets).run();