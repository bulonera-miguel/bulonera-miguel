// ============================================================
// Ventas.jsx — Registro de ventas
// ============================================================

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { ventasApi, facturacionApi, productosApi } from '../services/api'
import styles from './Ventas.module.css'

const TABS = [
  { id: 'nueva',     label: '+ Nueva venta' },
  { id: 'historial', label: '≡ Historial'   },
]

export default function Ventas() {

  const [tab, setTab] = useState('nueva')

  // ── FORMULARIO ────────────────────────────────────────────
  const [cliente, setCliente]               = useState(null)
  const [busqCliente, setBusqCliente]       = useState('')
  const [sugerClientes, setSugerClientes]   = useState([])
  const [mostrarSugerC, setMostrarSugerC]   = useState(false)
  const [fecha, setFecha]                   = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones]   = useState('')
  const [items, setItems]                   = useState([])
  const [busqProd, setBusqProd]             = useState('')
  const [sugerProd, setSugerProd]           = useState([])
  const [mostrarSugerP, setMostrarSugerP]   = useState(false)

  // Vincular factura
  const [vincularFactura, setVincularFactura]   = useState(false)
  const [busqFactura, setBusqFactura]           = useState('')
  const [facturas, setFacturas]                 = useState([])
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [mostrarSugerF, setMostrarSugerF]       = useState(false)

  const [guardando, setGuardando]           = useState(false)
  const [resultado, setResultado]           = useState(null)
  const [error, setError]                   = useState(null)

  // ── HISTORIAL ─────────────────────────────────────────────
  const [ventas, setVentas]                 = useState([])
  const [cargandoHist, setCargandoHist]     = useState(false)
  const [filtroDesde, setFiltroDesde]       = useState('')
  const [filtroHasta, setFiltroHasta]       = useState('')
  const [ventaDetalle, setVentaDetalle]     = useState(null)
  const [detalleItems, setDetalleItems]     = useState([])

  // ── CARGAR HISTORIAL ──────────────────────────────────────
  useEffect(() => {
    if (tab === 'historial') cargarHistorial()
  }, [tab])

  const cargarHistorial = async (params = {}) => {
    try {
      setCargandoHist(true)
      const data = await ventasApi.listar(params)
      setVentas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoHist(false)
    }
  }

  // ── BUSCADOR CLIENTES ─────────────────────────────────────
  useEffect(() => {
    if (busqCliente.trim().length < 2) { setMostrarSugerC(false); return }
    const t = setTimeout(async () => {
      try {
        const data = await facturacionApi.buscarClientes(busqCliente)
        setSugerClientes(data)
        setMostrarSugerC(true)
      } catch (e) { console.error(e) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqCliente])

  // ── BUSCADOR PRODUCTOS ────────────────────────────────────
  useEffect(() => {
    if (busqProd.trim().length < 2) { setMostrarSugerP(false); return }
    const t = setTimeout(async () => {
      try {
        const data = await productosApi.buscar(busqProd)
        setSugerProd(data)
        setMostrarSugerP(true)
      } catch (e) { console.error(e) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqProd])

  // ── BUSCADOR FACTURAS ─────────────────────────────────────
  useEffect(() => {
    if (!vincularFactura) return
    const cargarFacturas = async () => {
      try {
        const data = await facturacionApi.listarFacturas()
        setFacturas(data)
      } catch (e) { console.error(e) }
    }
    cargarFacturas()
  }, [vincularFactura])

  const facturasFiltradas = facturas.filter(f =>
    busqFactura.trim() === '' ||
    f.numero?.toLowerCase().includes(busqFactura.toLowerCase())
  )

  // ── SELECCIONAR CLIENTE ───────────────────────────────────
  const seleccionarCliente = (c) => {
    setCliente(c)
    setBusqCliente(c.nombre)
    setMostrarSugerC(false)
  }

  // ── AGREGAR PRODUCTO ──────────────────────────────────────
  const agregarProducto = (p) => {
    setBusqProd('')
    setMostrarSugerP(false)
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
        stock_actual:    p.stock_actual,
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

  // ── REGISTRAR VENTA ───────────────────────────────────────
  const registrarVenta = async () => {
    if (!items.length) { setError('Agregá al menos un producto'); return }
    setError(null)
    setGuardando(true)
    try {
      const res = await ventasApi.registrar({
        cliente_id:    cliente?.id || null,
        fecha,
        observaciones: observaciones || null,
        factura_id:    facturaSeleccionada?.id || null,
        items: items.map(i => ({
          producto_id:     i.producto_id,
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      })
      setResultado(res)
      setItems([])
      setCliente(null)
      setBusqCliente('')
      setObservaciones('')
      setFacturaSeleccionada(null)
      setBusqFactura('')
      setVincularFactura(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const nuevaVenta = () => {
    setResultado(null)
    setError(null)
    setItems([])
    setCliente(null)
    setBusqCliente('')
    setObservaciones('')
    setFacturaSeleccionada(null)
    setBusqFactura('')
    setVincularFactura(false)
    setFecha(new Date().toISOString().split('T')[0])
  }

  // ── VER DETALLE ───────────────────────────────────────────
  const verDetalle = async (venta) => {
    try {
      const data = await ventasApi.detalle(venta.id)
      setVentaDetalle(data)
      setDetalleItems(data.items || [])
    } catch (e) { console.error(e) }
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
            <h2 className={styles.pageTitle}>Ventas</h2>
            <span className={styles.pageSubtitle}>Registro de ventas con o sin factura</span>
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

        {/* ══════ TAB: NUEVA VENTA ══════ */}
        {tab === 'nueva' && (
          <div>

            {/* RESULTADO */}
            {resultado && (
              <div className={styles.resultadoWrap}>
                <div className={styles.resultadoIcono}>✓</div>
                <div className={styles.resultadoTextos}>
                  <div className={styles.resultadoTitulo}>Venta registrada correctamente</div>
                  <div className={styles.resultadoGrid}>
                    <div className={styles.resultadoItem}>
                      <span>Número</span><strong>{resultado.numero}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Cliente</span><strong>{resultado.cliente}</strong>
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
                    ✓ El stock fue descontado automáticamente
                  </div>
                </div>
                <button className={styles.btnNuevaVenta} onClick={nuevaVenta}>
                  + Nueva venta
                </button>
              </div>
            )}

            {!resultado && (
              <div className={styles.mainGrid}>

                {/* PANEL IZQUIERDO */}
                <div className={styles.formPanel}>

                  {/* CLIENTE */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Cliente (opcional)</div>
                    <div className={styles.buscadorWrap}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Buscar cliente por nombre..."
                        value={busqCliente}
                        onChange={e => {
                          setBusqCliente(e.target.value)
                          if (!e.target.value) setCliente(null)
                        }}
                      />
                      {mostrarSugerC && sugerClientes.length > 0 && (
                        <ul className={styles.sugerencias}>
                          {sugerClientes.map(c => (
                            <li key={c.id} className={styles.sugerItem}
                              onClick={() => seleccionarCliente(c)}>
                              <span className={styles.sugerNombre}>{c.nombre}</span>
                              {c.cuit && <span className={styles.sugerSub}>CUIT: {c.cuit}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {cliente && (
                      <div className={styles.clienteInfo}>
                        <div className={styles.clienteDatos}>
                          <span className={styles.clienteNombre}>{cliente.nombre}</span>
                          {cliente.cuit && <span className={styles.clienteSub}>CUIT: {cliente.cuit}</span>}
                        </div>
                        <button className={styles.btnQuitar}
                          onClick={() => { setCliente(null); setBusqCliente('') }}>✕</button>
                      </div>
                    )}
                    {!cliente && (
                      <div className={styles.sinCliente}>
                        ○ Sin cliente → se registra como Consumidor Final
                      </div>
                    )}
                  </div>

                  {/* FECHA */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Fecha de venta</div>
                    <input
                      type="date"
                      className={styles.input}
                      value={fecha}
                      onChange={e => setFecha(e.target.value)}
                    />
                  </div>

                  {/* VINCULAR FACTURA */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTituloRow}>
                      <span className={styles.seccionTitulo}>Vincular factura (opcional)</span>
                      <label className={styles.toggleWrap}>
                        <input
                          type="checkbox"
                          checked={vincularFactura}
                          onChange={e => {
                            setVincularFactura(e.target.checked)
                            if (!e.target.checked) {
                              setFacturaSeleccionada(null)
                              setBusqFactura('')
                            }
                          }}
                        />
                        <span className={styles.toggleLabel}>
                          {vincularFactura ? 'Sí' : 'No'}
                        </span>
                      </label>
                    </div>

                    {vincularFactura && (
                      <div className={styles.buscadorWrap}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Buscar por número de factura..."
                          value={busqFactura}
                          onChange={e => {
                            setBusqFactura(e.target.value)
                            setMostrarSugerF(true)
                          }}
                        />
                        {mostrarSugerF && facturasFiltradas.length > 0 && busqFactura && (
                          <ul className={styles.sugerencias}>
                            {facturasFiltradas.slice(0, 8).map(f => (
                              <li key={f.id} className={styles.sugerItem}
                                onClick={() => {
                                  setFacturaSeleccionada(f)
                                  setBusqFactura(f.numero)
                                  setMostrarSugerF(false)
                                }}>
                                <span className={styles.sugerNombre}>{f.numero}</span>
                                <span className={styles.sugerSub}>
                                  {f.clientes?.nombre || 'Consumidor Final'} — {fmtP(f.total)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {facturaSeleccionada && (
                          <div className={styles.facturaVinculada}>
                            <span>✓ {facturaSeleccionada.numero}</span>
                            <button className={styles.btnQuitar}
                              onClick={() => { setFacturaSeleccionada(null); setBusqFactura('') }}>✕</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* OBSERVACIONES */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Observaciones (opcional)</div>
                    <textarea
                      className={styles.textarea}
                      placeholder="Notas sobre esta venta..."
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* PRODUCTOS */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Agregar productos *</div>
                    <div className={styles.buscadorWrap}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Buscar producto por nombre o código..."
                        value={busqProd}
                        onChange={e => setBusqProd(e.target.value)}
                      />
                      {mostrarSugerP && sugerProd.length > 0 && (
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
                    <span className={styles.panelTitulo}>Detalle de la venta</span>
                    {items.length > 0 && (
                      <span className={styles.itemsCount}>
                        {items.length} ítem{items.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div className={styles.itemsVacio}>
                      Agregá productos para comenzar
                    </div>
                  ) : (
                    <div className={styles.itemsList}>
                      {items.map(item => (
                        <div key={item.producto_id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemNombre}>{item.nombre}</span>
                            <span className={styles.itemCodigo}>{item.codigo}</span>
                            {item.stock_actual <= 0 && (
                              <span className={styles.itemSinStock}>⚠ Sin stock</span>
                            )}
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
                        <span>Total Venta</span>
                        <span>{fmtP(total)}</span>
                      </div>
                      {facturaSeleccionada && (
                        <div className={styles.facturaVinculadaInfo}>
                          ✓ Vinculada a factura {facturaSeleccionada.numero}
                        </div>
                      )}
                      <button
                        className={styles.btnRegistrar}
                        onClick={registrarVenta}
                        disabled={guardando}
                      >
                        {guardando ? (
                          <span className={styles.btnCargando}>
                            <span className={styles.spinner}></span>
                            Registrando...
                          </span>
                        ) : '▶ Registrar Venta'}
                      </button>
                      <div className={styles.nota}>
                        El stock se descontará automáticamente al registrar
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ══════ TAB: HISTORIAL ══════ */}
        {tab === 'historial' && (
          <div>
            <div className={styles.filtrosWrap}>
              <div className={styles.filtroGrupo}>
                <label>Desde</label>
                <input type="date" className={styles.filtroInput}
                  value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
              </div>
              <div className={styles.filtroGrupo}>
                <label>Hasta</label>
                <input type="date" className={styles.filtroInput}
                  value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
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

            {cargandoHist ? (
              <div className={styles.estado}>Cargando ventas...</div>
            ) : ventas.length === 0 ? (
              <div className={styles.estado}>No hay ventas registradas</div>
            ) : (
              <>
                {/* TABLA — desktop/tablet */}
                <table className={styles.tabla}>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Factura</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map(v => (
                      <tr key={v.id} className={styles.tablaFila} onClick={() => verDetalle(v)}>
                        <td className={styles.tdNumero}>V-{v.id.slice(0,8).toUpperCase()}</td>
                        <td>{v.clientes?.nombre || 'Consumidor Final'}</td>
                        <td>{fmtF(v.fecha)}</td>
                        <td>{v.factura_id ? <span className={styles.badgeFactura}>✓ Con factura</span> : '—'}</td>
                        <td className={styles.tdTotal}>{fmtP(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* TARJETAS — móvil */}
                <div className={styles.tarjetasList}>
                  {ventas.map(v => (
                    <div key={v.id} className={styles.tarjeta} onClick={() => verDetalle(v)}>
                      <div className={styles.tarjetaTop}>
                        <span className={styles.tarjetaNumero}>
                          V-{v.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={styles.tarjetaTotal}>{fmtP(v.total)}</span>
                      </div>
                      <div className={styles.tarjetaCliente}>
                        {v.clientes?.nombre || 'Consumidor Final'}
                      </div>
                      <div className={styles.tarjetaFila}>
                        <span className={styles.tarjetaFecha}>{fmtF(v.fecha)}</span>
                        {v.factura_id && (
                          <span className={styles.tarjetaBadgeFactura}>✓ Con factura</span>
                        )}
                      </div>
                      <div className={styles.tarjetaVerDetalle}>Ver detalle ›</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL DETALLE ── */}
      {ventaDetalle && (
        <div className={styles.modalOverlay} onClick={() => setVentaDetalle(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Venta V-{ventaDetalle.id?.slice(0,8).toUpperCase()}</h3>
              <button className={styles.modalCerrar} onClick={() => setVentaDetalle(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleRow}>
                <span>Cliente</span>
                <strong>{ventaDetalle.clientes?.nombre || 'Consumidor Final'}</strong>
              </div>
              <div className={styles.detalleRow}>
                <span>Fecha</span>
                <strong>{fmtF(ventaDetalle.fecha)}</strong>
              </div>
              <div className={styles.detalleRow}>
                <span>Total</span>
                <strong className={styles.resultadoTotal}>{fmtP(ventaDetalle.total)}</strong>
              </div>
              {ventaDetalle.factura_id && (
                <div className={styles.detalleRow}>
                  <span>Factura vinculada</span>
                  <strong className={styles.badgeFactura}>✓ Con factura</strong>
                </div>
              )}
              {ventaDetalle.observaciones && (
                <div className={styles.detalleRow}>
                  <span>Observaciones</span>
                  <strong>{ventaDetalle.observaciones}</strong>
                </div>
              )}
              {detalleItems.length > 0 && (
                <div className={styles.detalleItemsWrap}>
                  <div className={styles.detalleItemsTitulo}>Productos vendidos</div>
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
