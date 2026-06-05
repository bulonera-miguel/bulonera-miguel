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

  crear: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/categorias/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al crear categoría')
    }
    return res.json()
  },

  actualizar: async (id, datos) => {
    const res = await fetch(`${BASE_URL}/api/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al actualizar categoría')
    }
    return res.json()
  },

  eliminar: async (id) => {
    const res = await fetch(`${BASE_URL}/api/categorias/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar categoría')
  },
}


// ── PROVEEDORES ────────────────────────────────────────────

export const proveedoresApi = {

  listar: async () => {
    const res = await fetch(`${BASE_URL}/api/proveedores/`)
    if (!res.ok) throw new Error('Error al listar proveedores')
    return res.json()
  },

  buscar: async (texto) => {
    const res = await fetch(`${BASE_URL}/api/proveedores/buscar?q=${encodeURIComponent(texto)}`)
    if (!res.ok) throw new Error('Error al buscar proveedores')
    return res.json()
  },

  crear: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/proveedores/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al crear proveedor')
    }
    return res.json()
  },

  actualizar: async (id, datos) => {
    const res = await fetch(`${BASE_URL}/api/proveedores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al actualizar proveedor')
    }
    return res.json()
  },

  eliminar: async (id) => {
    const res = await fetch(`${BASE_URL}/api/proveedores/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar proveedor')
  },
}


// ── COMPRAS ────────────────────────────────────────────────

export const comprasApi = {

  listar: async (params = {}) => {
    const p = new URLSearchParams()
    if (params.proveedor_id) p.append('proveedor_id', params.proveedor_id)
    if (params.desde)        p.append('desde', params.desde)
    if (params.hasta)        p.append('hasta', params.hasta)
    const qs = p.toString()
    const res = await fetch(`${BASE_URL}/api/compras/${qs ? '?' + qs : ''}`)
    if (!res.ok) throw new Error('Error al listar compras')
    return res.json()
  },

  detalle: async (id) => {
    const res = await fetch(`${BASE_URL}/api/compras/${id}`)
    if (!res.ok) throw new Error('Error al obtener detalle de compra')
    return res.json()
  },

  registrar: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/compras/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al registrar compra')
    }
    return res.json()
  },

  reporteDeudaMensual: async (anio, mes) => {
    const res = await fetch(
      `${BASE_URL}/api/compras/reportes/deuda-mensual?anio=${anio}&mes=${mes}`
    )
    if (!res.ok) throw new Error('Error al obtener reporte')
    return res.json()
  },
}

// ── VENTAS ─────────────────────────────────────────────────

export const ventasApi = {

  listar: async (params = {}) => {
    const p = new URLSearchParams()
    if (params.cliente_id) p.append('cliente_id', params.cliente_id)
    if (params.desde)      p.append('desde', params.desde)
    if (params.hasta)      p.append('hasta', params.hasta)
    const qs = p.toString()
    const res = await fetch(`${BASE_URL}/api/ventas/${qs ? '?' + qs : ''}`)
    if (!res.ok) throw new Error('Error al listar ventas')
    return res.json()
  },

  detalle: async (id) => {
    const res = await fetch(`${BASE_URL}/api/ventas/${id}`)
    if (!res.ok) throw new Error('Error al obtener detalle de venta')
    return res.json()
  },

  registrar: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/ventas/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al registrar venta')
    }
    return res.json()
  },
}

// ── PORTADA ────────────────────────────────────────────────

export const portadaApi = {

  resumen: async () => {
    const res = await fetch(`${BASE_URL}/api/portada/resumen`)
    if (!res.ok) throw new Error('Error al obtener resumen de portada')
    return res.json()
  },
}

// ── STOCK ──────────────────────────────────────────────────

export const stockApi = {

  // Obtener productos con stock crítico
  criticos: async () => {
    const res = await fetch(`${BASE_URL}/api/stock/criticos`)
    if (!res.ok) throw new Error('Error al obtener stock crítico')
    return res.json()
  },

  // Registrar un movimiento de stock (entrada o salida)
  registrarMovimiento: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/stock/movimiento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al registrar movimiento')
    }
    return res.json()
  },

  // Obtener historial de movimientos de un producto
  historial: async (productoId) => {
    const res = await fetch(`${BASE_URL}/api/stock/${productoId}/movimientos`)
    if (!res.ok) throw new Error('Error al obtener historial')
    return res.json()
  },
}

// ── FACTURACIÓN ────────────────────────────────────────────

export const facturacionApi = {

  // Buscar clientes por nombre
  buscarClientes: async (texto) => {
    const res = await fetch(`${BASE_URL}/api/facturacion/clientes/buscar?q=${encodeURIComponent(texto)}`)
    if (!res.ok) throw new Error('Error al buscar clientes')
    return res.json()
  },

  // Listar todos los clientes
  listarClientes: async () => {
    const res = await fetch(`${BASE_URL}/api/facturacion/clientes`)
    if (!res.ok) throw new Error('Error al listar clientes')
    return res.json()
  },

  // Crear un cliente nuevo
  crearCliente: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/facturacion/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al crear cliente')
    }
    return res.json()
  },

  // Emitir una factura electrónica
  emitir: async (datos) => {
    const res = await fetch(`${BASE_URL}/api/facturacion/emitir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || 'Error al emitir factura')
    }
    return res.json()
  },

  // Listar facturas emitidas
  listarFacturas: async () => {
    const res = await fetch(`${BASE_URL}/api/facturacion/facturas`)
    if (!res.ok) throw new Error('Error al listar facturas')
    return res.json()
  },

  // Detalle de una factura
  detalle: async (facturaId) => {
    const res = await fetch(`${BASE_URL}/api/facturacion/facturas/${facturaId}`)
    if (!res.ok) throw new Error('Error al obtener detalle de factura')
    return res.json()
  },
}
