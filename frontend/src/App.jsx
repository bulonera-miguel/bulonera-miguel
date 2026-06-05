import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute  from './components/ProtectedRoute'
import Home       from './pages/Home'
import Inventario from './pages/Inventario'
import Reportes   from './pages/Reportes'
import Login      from './pages/Login'
import Usuarios   from './pages/Usuarios'
import Facturacion from './pages/Facturacion'
import Proveedores from './pages/Proveedores'
import Compras from './pages/Compras'
import Ventas from './pages/Ventas'
import Clientes from './pages/Clientes'
import Footer from './components/Footer'

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

          <Route path="/clientes" element=
            {
              <ProtectedRoute><Clientes /></ProtectedRoute>
            } />

          <Route path="/proveedores" element={
            <ProtectedRoute><Proveedores /></ProtectedRoute>
          } />  

          <Route path="/compras" element={
            <ProtectedRoute><Compras /></ProtectedRoute>
          } />        

          <Route path="/ventas" element={
            <ProtectedRoute><Ventas /></ProtectedRoute>
          } />        
        </Routes>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}
