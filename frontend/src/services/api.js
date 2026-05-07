// ============================================================
// api.js — Módulo central para todas las llamadas a la API
// Todos los componentes importan desde acá, no hacen fetch directo
// ============================================================

const BASE_URL = 'http://localhost:8000'
// BASE_URL: la dirección base del backend FastAPI.
// Cuando el backend se suba a Oracle Cloud, solo cambiamos esta línea.

// ── PRODUCTOS ──────────────────────────────────────────────

export const productosApi = {

  // Listar todos los productos activos
  listar: async () => {
    const res = await fetch(`${BASE_URL}/api/productos/?activo=true`)
    if (!res.ok) throw new Error('Error al listar productos')
    return res.json()
  },

  // Buscar productos por nombre
  buscar: async (texto) => {
    const res = await fetch(`${BASE_URL}/api/productos/buscar?q=${encodeURIComponent(texto)}`)
    if (!res.ok) throw new Error('Error al buscar productos')
    return res.json()
  },

  // Crear un producto nuevo
  crear: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/productos/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al crear producto')
    }
    return res.json()
  },

  // Actualizar un producto existente
  actualizar: async (id, datos) => {
    const res = await fetch(`${BASE_URL}/api/productos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al actualizar producto')
    }
    return res.json()
  },

  // Eliminar un producto (soft delete — pone activo=false)
  eliminar: async (id) => {
    const res = await fetch(`${BASE_URL}/api/productos/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar producto')
    // DELETE exitoso devuelve 204 sin body
  },
}

// ── CATEGORIAS ─────────────────────────────────────────────

export const categoriasApi = {

  listar: async () => {
    const res = await fetch(`${BASE_URL}/api/categorias/`)
    if (!res.ok) throw new Error('Error al listar categorías')
    return res.json()
  },
}