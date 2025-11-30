// En tu backend (/api/ordenes)
app.get('/api/ordenes', async (req, res) => {
  try {
    // Consulta con mapeo correcto de campos
    const ordenes = await db.select(
      'id',
      'cliente_nombre as nombre',
      'cliente_email as email', 
      'cliente_telefono as telefono',
      'total',
      'metodo_pago',
      'estado',
      'fecha_creacion'
    ).from('ordenes').orderBy('fecha_creacion', 'desc');
    
    // Procesar para incluir los tickets (necesitas otra consulta)
    const ordenesConTickets = await Promise.all(
      ordenes.map(async (orden) => {
        // Consultar los tickets de esta orden
        const tickets = await db('tickets')
          .where('orden_id', orden.id)
          .select('numero');
        
        return {
          ...orden,
          tickets: tickets.map(t => t.numero).join(', '), // o el formato que prefieras
          // Si quieres el count en lugar de los números:
          // tickets: tickets.length
        };
      })
    );
    
    res.json({ 
      success: true, 
      data: { ordenes: ordenesConTickets } 
    });
    
  } catch (error) {
    console.error('Error en /api/ordenes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});