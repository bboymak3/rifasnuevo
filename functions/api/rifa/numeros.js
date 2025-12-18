export async function onRequestGet(context) {
    const { env } = context
    
    try {
        // Asegurar que existan números si no hay ninguno
        const existing = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM tickets WHERE rifa_id = 1'
        ).first()
        
        if (existing.count === 0) {
            // Crear números 1-100 si no existen
            const stmt = env.DB.prepare(
                'INSERT INTO tickets (rifa_id, numero, estado) VALUES (1, ?, "disponible")'
            )
            
            const inserts = Array.from({length: 100}, (_, i) => 
                stmt.bind(i + 1).run()
            )
            
            await env.DB.batch(inserts)
        }
        
        const numeros = await env.DB.prepare(
            'SELECT numero, estado FROM tickets WHERE rifa_id = 1 ORDER BY numero'
        ).all()
        
        return new Response(JSON.stringify(numeros.results), {
            headers: { 'Content-Type': 'application/json' }
        })
        
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error al cargar números' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}