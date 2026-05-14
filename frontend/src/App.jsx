import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute  from './components/ProtectedRoute'
import Home       from './pages/Home'
import Inventario from './pages/Inventario'
import Stock      from './pages/Stock'
import Reportes   from './pages/Reportes'
import Login      from './pages/Login'
import Usuarios   from './pages/Usuarios'
import Facturacion from './pages/Facturacion'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública — no requiere login */}
          <Route path="/"      element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas — requieren login */}
          <Route path="/inventario" element={
            <ProtectedRoute><Inventario /></ProtectedRoute>
          } />

          <Route path="/stock" element={
            <ProtectedRoute><Stock /></ProtectedRoute>
          } />

          <Route path="/reportes" element={
            <ProtectedRoute><Reportes /></ProtectedRoute>
          } />

          {/* Ruta solo admin — requiere login + rol admin */}
          <Route path="/usuarios" element={
            <ProtectedRoute soloAdmin={true}><Usuarios /></ProtectedRoute>
          } />

          <Route path="/facturacion" element={
            <ProtectedRoute><Facturacion /></ProtectedRoute>
          } />          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
