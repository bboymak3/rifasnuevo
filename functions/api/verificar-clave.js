// /api/verificar-clave.js
const CLAVE_ADMIN = "admin123"; // Cambia esta clave por la que desees

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { clave } = req.body;
    
    if (clave === CLAVE_ADMIN) {
      res.status(200).json({ 
        exito: true, 
        mensaje: 'Clave correcta' 
      });
    } else {
      res.status(401).json({ 
        exito: false, 
        mensaje: 'Clave incorrecta' 
      });
    }
  } else {
    res.status(405).json({ 
      exito: false, 
      mensaje: 'Método no permitido' 
    });
  }
}