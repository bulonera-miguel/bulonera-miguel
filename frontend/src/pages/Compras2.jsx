// ============================================================
// Compras.jsx — Registro de compras a proveedores
// ============================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { comprasApi, proveedoresApi, productosApi } from '../services/api'
import styles from './Compras.module.css'

const TABS = [
  { id: 'nueva',     label: '+ Nueva compra'  },
  { id: 'historial', label: '≡ Historial'     },
]

export default function Compras() {

  const [tab, setTab] = useState('nueva')

  // ── FORMULARIO NUEVA COMPRA ───────────────────────────────
  const [proveedor, setProveedor]           = useState(null)
  const [busqProv, setBusqProv]             = useState('')
  const [sugerProv, setSugerProv]           = useState([])
  const [mostrarSugerProv, setMostrarSugerProv] = useState(false)
  const [fecha, setFecha]                   = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones]   = useState('')
  const [items, setItems]                   = useState([])
  const [busqProd, setBusqProd]             = useState('')
  const [sugerProd, setSugerProd]           = useState([])
  const [mostrarSugerProd, setMostrarSugerProd] = useState(false)
  const [guardando, setGuardando]           = useState(false)
  const [resultado, setResultado]           = useState(null)
  const [error, setError]                   = useState(null)

  // ── HISTORIAL ─────────────────────────────────────────────
  const [compras, setCompras]               = useState([])
  const [cargandoHist, setCargandoHist]     = useState(false)
  const [filtroDesde, setFiltroDesde]       = useState('')
  const [filtroHasta, setFiltroHasta]       = useState('')
  const [compraDetalle, setCompraDetalle]   = useState(null)
  const [detalleItems, setDetalleItems]     = useState([])

  // ── CARGAR HISTORIAL ──────────────────────────────────────
  useEffect(() => {
    if (tab === 'historial') cargarHistorial()
  }, [tab])

  const cargarHistorial = async (params = {}) => {
    try {
      setCargandoHist(true)
      const data = await comprasApi.listar(params)
      setCompras(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoHist(false)
    }
  }

  // ── BUSCADOR PROVEEDORES ──────────────────────────────────
  useEffect(() => {
    if (busqProv.trim().length < 2) { setMostrarSugerProv(false); return }
    const t = setTimeout(async () => {
      try {
        const data = await proveedoresApi.buscar(busqProv)
        setSugerProv(data)
        setMostrarSugerProv(true)
      } catch (e) { console.error(e) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqProv])

  // ── BUSCADOR PRODUCTOS ────────────────────────────────────
  useEffect(() => {
    if (busqProd.trim().length < 2) { setMostrarSugerProd(false); return }
    const t = setTimeout(async () => {
      try {
        const data = await productosApi.buscar(busqProd)
        setSugerProd(data)
        setMostrarSugerProd(true)
      } catch (e) { console.error(e) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqProd])

  // ── SELECCIONAR PROVEEDOR ─────────────────────────────────
  const seleccionarProveedor = (p) => {
    setProveedor(p)
    setBusqProv(p.nombre)
    setMostrarSugerProv(false)
  }

  // ── AGREGAR PRODUCTO ──────────────────────────────────────
  const agregarProducto = (p) => {
    setBusqProd('')
    setMostrarSugerProd(false)
    const existe = items.find(i => i.producto_id === p.id)
    if (existe) {
      setItems(items.map(i =>
        i.producto_id === p.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i
      ))
    } else {
      setItems([...items, {
        producto_id:     p.id,
        codigo:          p.codigo,
        nombre:          p.nombre,
        cantidad:        1,
        precio_unitario: p.precio,
        subtotal:        p.precio,
      }])
    }
  }

  const cambiarCantidad = (productoId, cantidad) => {
    if (cantidad < 1) return
    setItems(items.map(i =>
      i.producto_id === productoId
        ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario }
        : i
    ))
  }

  const cambiarPrecio = (productoId, precio) => {
    const p = parseFloat(precio) || 0
    setItems(items.map(i =>
      i.producto_id === productoId
        ? { ...i, precio_unitario: p, subtotal: i.cantidad * p }
        : i
    ))
  }

  const eliminarItem = (productoId) => setItems(items.filter(i => i.producto_id !== productoId))

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  // ── REGISTRAR COMPRA ──────────────────────────────────────
  const registrarCompra = async () => {
    if (!proveedor)    { setError('Seleccioná un proveedor'); return }
    if (!items.length) { setError('Agregá al menos un producto'); return }
    setError(null)
    setGuardando(true)
    try {
      const res = await comprasApi.registrar({
        proveedor_id:  proveedor.id,
        fecha,
        observaciones: observaciones || null,
        items: items.map(i => ({
          producto_id:     i.producto_id,
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      })
      setResultado(res)
      setItems([])
      setProveedor(null)
      setBusqProv('')
      setObservaciones('')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const nuevaCompra = () => {
    setResultado(null)
    setError(null)
    setItems([])
    setProveedor(null)
    setBusqProv('')
    setObservaciones('')
    setFecha(new Date().toISOString().split('T')[0])
  }

  // ── VER DETALLE ───────────────────────────────────────────
  const verDetalle = async (compra) => {
    try {
      const data = await comprasApi.detalle(compra.id)
      setCompraDetalle(data)
      setDetalleItems(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  // ── FORMATEO ──────────────────────────────────────────────
  const fmtP = (n) => `$${Number(n).toLocaleString('es-AR')}`
  const fmtF = (f) => {
    if (!f) return '—'
    try { return new Date(f + 'T00:00:00').toLocaleDateString('es-AR') }
    catch { return f }
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.contenido}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Compras</h2>
            <span className={styles.pageSubtitle}>Registro de compras a proveedores</span>
          </div>
        </div>

        {/* TABS */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActivo : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            TAB: NUEVA COMPRA
        ══════════════════════════════════════════════ */}
        {tab === 'nueva' && (
          <div>

            {/* RESULTADO */}
            {resultado && (
              <div className={styles.resultadoWrap}>
                <div className={styles.resultadoIcono}>✓</div>
                <div className={styles.resultadoTextos}>
                  <div className={styles.resultadoTitulo}>Compra registrada correctamente</div>
                  <div className={styles.resultadoGrid}>
                    <div className={styles.resultadoItem}>
                      <span>Número</span><strong>{resultado.numero}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Proveedor</span><strong>{resultado.proveedor}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Productos</span><strong>{resultado.items} ítems</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Total</span>
                      <strong className={styles.resultadoTotal}>{fmtP(resultado.total)}</strong>
                    </div>
                  </div>
                  <div className={styles.resultadoNota}>
                    ✓ El stock de los productos fue actualizado automáticamente
                  </div>
                </div>
                <button className={styles.btnNuevaCompra} onClick={nuevaCompra}>
                  + Nueva compra
                </button>
              </div>
            )}

            {!resultado && (
              <div className={styles.mainGrid}>

                {/* PANEL IZQUIERDO */}
                <div className={styles.formPanel}>

                  {/* PROVEEDOR */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Proveedor *</div>
                    <div className={styles.buscadorWrap}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Buscar proveedor por nombre..."
                        value={busqProv}
                        onChange={e => {
                          setBusqProv(e.target.value)
                          if (!e.target.value) setProveedor(null)
                        }}
                      />
                      {mostrarSugerProv && sugerProv.length > 0 && (
                        <ul className={styles.sugerencias}>
                          {sugerProv.map(p => (
                            <li key={p.id} className={styles.sugerItem}
                              onClick={() => seleccionarProveedor(p)}>
                              <span className={styles.sugerNombre}>{p.nombre}</span>
                              {p.cuit && <span className={styles.sugerSub}>CUIT: {p.cuit}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {proveedor && (
                      <div className={styles.proveedorInfo}>
                        <div className={styles.proveedorDatos}>
                          <span className={styles.proveedorNombre}>{proveedor.nombre}</span>
                          {proveedor.cuit && (
                            <span className={styles.proveedorSub}>CUIT: {proveedor.cuit}</span>
                          )}
                        </div>
                        <button className={styles.btnQuitar}
                          onClick={() => { setProveedor(null); setBusqProv('') }}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* FECHA */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Fecha de compra</div>
                    <input
                      type="date"
                      className={styles.input}
                      value={fecha}
                      onChange={e => setFecha(e.target.value)}
                      lang="es-AR"
                    />
                  </div>

                  {/* OBSERVACIONES */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Observaciones (opcional)</div>
                    <textarea
                      className={styles.textarea}
                      placeholder="Notas sobre esta compra..."
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* PRODUCTOS */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Agregar productos</div>
                    <div className={styles.buscadorWrap}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Buscar producto por nombre o código..."
                        value={busqProd}
                        onChange={e => setBusqProd(e.target.value)}
                      />
                      {mostrarSugerProd && sugerProd.length > 0 && (
                        <ul className={styles.sugerencias}>
                          {sugerProd.map(p => (
                            <li key={p.id} className={styles.sugerItem}
                              onClick={() => agregarProducto(p)}>
                              <div className={styles.sugerProdLeft}>
                                <span className={styles.sugerNombre}>{p.nombre}</span>
                                <span className={styles.sugerSub}>{p.codigo}</span>
                              </div>
                              <div className={styles.sugerProdRight}>
                                <span className={styles.sugerPrecio}>{fmtP(p.precio)}</span>
                                <span className={styles.sugerStock}>Stock: {p.stock_actual}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {error && <div className={styles.errorMsg}>⚠ {error}</div>}

                </div>

                {/* PANEL DERECHO */}
                <div className={styles.detallePanel}>
                  <div className={styles.detallePanelHeader}>
                    <span className={styles.panelTitulo}>Detalle de la compra</span>
                    {items.length > 0 && (
                      <span className={styles.itemsCount}>
                        {items.length} ítem{items.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div className={styles.itemsVacio}>
                      Seleccioná un proveedor y agregá productos
                    </div>
                  ) : (
                    <div className={styles.itemsList}>
                      {items.map(item => (
                        <div key={item.producto_id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemNombre}>{item.nombre}</span>
                            <span className={styles.itemCodigo}>{item.codigo}</span>
                          </div>
                          <div className={styles.itemControles}>
                            <div className={styles.itemCantidad}>
                              <button className={styles.btnCantidad}
                                onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}>−</button>
                              <input
                                type="number"
                                className={styles.inputCantidad}
                                value={item.cantidad}
                                onChange={e => cambiarCantidad(item.producto_id, parseInt(e.target.value) || 1)}
                                min="1"
                              />
                              <button className={styles.btnCantidad}
                                onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}>+</button>
                            </div>
                            <div className={styles.itemPrecioWrap}>
                              <span className={styles.itemPrecioLabel}>$</span>
                              <input
                                type="number"
                                className={styles.inputPrecio}
                                value={item.precio_unitario}
                                onChange={e => cambiarPrecio(item.producto_id, e.target.value)}
                                min="0" step="0.01"
                              />
                            </div>
                            <span className={styles.itemSubtotal}>{fmtP(item.subtotal)}</span>
                            <button className={styles.btnEliminarItem}
                              onClick={() => eliminarItem(item.producto_id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {items.length > 0 && (
                    <div className={styles.totalesWrap}>
                      <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                        <span>Total Compra</span>
                        <span>{fmtP(total)}</span>
                      </div>
                      <button
                        className={styles.btnRegistrar}
                        onClick={registrarCompra}
                        disabled={guardando}
                      >
                        {guardando ? (
                          <span className={styles.btnCargando}>
                            <span className={styles.spinner}></span>
                            Registrando...
                          </span>
                        ) : '▶ Registrar Compra'}
                      </button>
                      <div className={styles.nota}>
                        El stock se actualizará automáticamente al registrar
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: HISTORIAL
        ══════════════════════════════════════════════ */}
        {tab === 'historial' && (
          <div>

            {/* FILTROS */}
            <div className={styles.filtrosWrap}>
              <div className={styles.filtroGrupo}>
                <label>Desde</label>
                <input type="date" className={styles.filtroInput}
                  value={filtroDesde}
                  onChange={e => setFiltroDesde(e.target.value)} />
              </div>
              <div className={styles.filtroGrupo}>
                <label>Hasta</label>
                <input type="date" className={styles.filtroInput}
                  value={filtroHasta}
                  onChange={e => setFiltroHasta(e.target.value)} />
              </div>
              <button className={styles.btnFiltrar}
                onClick={() => cargarHistorial({ desde: filtroDesde, hasta: filtroHasta })}>
                ▶ Filtrar
              </button>
              <button className={styles.btnLimpiarFiltro}
                onClick={() => { setFiltroDesde(''); setFiltroHasta(''); cargarHistorial() }}>
                ✕ Limpiar
              </button>
            </div>

            {/* TABLA */}
            {cargandoHist ? (
              <div className={styles.estado}>Cargando compras...</div>
            ) : compras.length === 0 ? (
              <div className={styles.estado}>No hay compras registradas</div>
            ) : (
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Proveedor</th>
                    <th>Fecha</th>
                    <th>Productos</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map(c => (
                    <tr key={c.id} className={styles.tablaFila}
                      onClick={() => verDetalle(c)}>
                      <td className={styles.tdNumero}>
                        C-{c.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td>{c.proveedores?.nombre || '—'}</td>
                      <td>{fmtF(c.fecha)}</td>
                      <td className={styles.tdCenter}>—</td>
                      <td className={styles.tdTotal}>{fmtP(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL DETALLE COMPRA ── */}
      {compraDetalle && (
        <div className={styles.modalOverlay} onClick={() => setCompraDetalle(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Compra C-{compraDetalle.id?.slice(0, 8).toUpperCase()}</h3>
              <button className={styles.modalCerrar}
                onClick={() => setCompraDetalle(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleRow}>
                <span>Proveedor</span>
                <strong>{compraDetalle.proveedores?.nombre || '—'}</strong>
              </div>
              <div className={styles.detalleRow}>
                <span>Fecha</span>
                <strong>{fmtF(compraDetalle.fecha)}</strong>
              </div>
              <div className={styles.detalleRow}>
                <span>Total</span>
                <strong className={styles.resultadoTotal}>{fmtP(compraDetalle.total)}</strong>
              </div>
              {compraDetalle.observaciones && (
                <div className={styles.detalleRow}>
                  <span>Observaciones</span>
                  <strong>{compraDetalle.observaciones}</strong>
                </div>
              )}

              {detalleItems.length > 0 && (
                <div className={styles.detalleItemsWrap}>
                  <div className={styles.detalleItemsTitulo}>Productos comprados</div>
                  <table className={styles.detalleItemsTabla}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleItems.map((it, i) => (
                        <tr key={i}>
                          <td>{it.productos?.nombre || '—'}</td>
                          <td className={styles.tdCenter}>{it.cantidad}</td>
                          <td className={styles.tdRight}>{fmtP(it.precio_unitario)}</td>
                          <td className={styles.tdRight}>{fmtP(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
