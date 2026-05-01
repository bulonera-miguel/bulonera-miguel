import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home       from './pages/Home'
import Inventario from './pages/Inventario'
import Stock      from './pages/Stock'
import Reportes   from './pages/Reportes'
import Login      from './pages/Login'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<Home />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/stock"      element={<Stock />} />
        <Route path="/reportes"   element={<Reportes />} />
        <Route path="/login"      element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}