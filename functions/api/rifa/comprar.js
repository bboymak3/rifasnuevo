export async function onRequestPost(context) {
    const { request, env } = context
    
    try {
        const formData = await request.formData()
        
        const numerosStr = formData.get('numeros')
        const nombre = formData.get('nombre')
        const telefono = formData.get('telefono')
        const email = formData.get('email')
        const referencia = formData.get('referencia')
        const captura = formData.get('captura')
        
        if (!numerosStr || !nombre || !telefono || !referencia || !captura) {
            return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }
        
        const numeros = numerosStr.split(',').map(n => parseInt(n.trim()))
        
        // Subir imagen a R2 (si está configurado) o guardar base64
        let capturaUrl = null
        if (captura && captura.size > 0) {
            // Por ahora guardamos el nombre del archivo
            capturaUrl = `captura_${Date.now()}_${captura.name}`
            // En producción subirías a R2
        }
        
        // Verificar que los números estén disponibles
        const disponibles = await env.DB.prepare(
            'SELECT numero FROM tickets WHERE numero IN (' + numeros.map(() => '?').join(',') + ') AND estado = "disponible" AND rifa_id = 1'
        ).bind(...numeros).all()
        
        if (disponibles.results.length !== numeros.length) {
            return new Response(JSON.stringify({ error: 'Algunos números ya no están disponibles' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            })
        }
        
        // Actualizar números a estado "reservado"
        const stmt = env.DB.prepare(
            'UPDATE tickets SET estado = "reservado", referencia_pago = ?, captura_pago = ? WHERE numero = ? AND rifa_id = 1'
        )
        
        const updates = numeros.map(num => 
            stmt.bind(referencia, capturaUrl, num).run()
        )
        
        await env.DB.batch(updates)
        
        // Guardar información del comprador en auditoría
        await env.DB.prepare(
            'INSERT INTO auditoria (accion, detalles) VALUES (?, ?)'
        ).bind('RESERVA', JSON.stringify({
            nombre,
            telefono,
            email,
            numeros,
            referencia,
            fecha: new Date().toISOString()
        })).run()
        
        return new Response(JSON.stringify({ 
            message: 'Números reservados exitosamente',
            numeros_reservados: numeros.length 
        }), {
            headers: { 'Content-Type': 'application/json' }
        })
        
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error al procesar pago' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}