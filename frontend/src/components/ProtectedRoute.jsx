// ============================================================
// ProtectedRoute.jsx — Protege rutas que requieren login
// Si no hay sesión activa, redirige al login automáticamente
// ============================================================

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, soloAdmin = false }) {
  const { usuario, perfil, cargando, esAdmin } = useAuth()

  // Mientras verificamos la sesión mostramos un loader
  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh', background: '#07111F',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase',
        color: 'rgba(200,228,244,0.40)'
      }}>
        Verificando sesión...
      </div>
    )
  }

  // Si no hay usuario logueado, redirigimos al login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Si la ruta es solo para admin y el usuario no lo es
  if (soloAdmin && !esAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
