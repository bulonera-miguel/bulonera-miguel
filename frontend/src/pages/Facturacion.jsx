// ============================================================
// Facturacion.jsx — Página de facturación electrónica
// Emisión de facturas A y B con integración AFIP
// ============================================================

import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { facturacionApi, productosApi } from '../services/api'
import styles from './Facturacion.module.css'

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'nueva',    label: '+ Nueva factura'    },
  { id: 'historial',label: '≡ Historial'        },
]

export default function Facturacion() {

  const [tab, setTab]                   = useState('nueva')

  // ── ESTADOS FORMULARIO ────────────────────────────────────
  const [tipoFactura, setTipoFactura]   = useState('B')
  const [cliente, setCliente]           = useState(null)
  const [busqCliente, setBusqCliente]   = useState('')
  const [sugerClientes, setSugerClientes] = useState([])
  const [mostrarSugerC, setMostrarSugerC] = useState(false)
  const [modalCliente, setModalCliente] = useState(false)
  const [formCliente, setFormCliente]   = useState({ nombre: '', cuit: '', direccion: '', telefono: '', email: '' })

  const [busqProducto, setBusqProducto] = useState('')
  const [sugerProductos, setSugerProductos] = useState([])
  const [mostrarSugerP, setMostrarSugerP] = useState(false)
  const [items, setItems]               = useState([])
  // items: lista de productos agregados a la factura

  const [emitiendo, setEmitiendo]       = useState(false)
  const [resultado, setResultado]       = useState(null)
  // resultado: respuesta de AFIP con CAE, número, etc.
  const [error, setError]               = useState(null)

  // ── ESTADOS HISTORIAL ─────────────────────────────────────
  const [facturas, setFacturas]         = useState([])
  const [cargandoHist, setCargandoHist] = useState(false)
  const [facturaDetalle, setFacturaDetalle] = useState(null)

  // ── CARGAR HISTORIAL ──────────────────────────────────────
  useEffect(() => {
    if (tab === 'historial') cargarHistorial()
  }, [tab])

  const cargarHistorial = async () => {
    try {
      setCargandoHist(true)
      const data = await facturacionApi.listarFacturas()
      setFacturas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoHist(false)
    }
  }

  // ── BUSCADOR DE CLIENTES ──────────────────────────────────
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

  // ── BUSCADOR DE PRODUCTOS ─────────────────────────────────
  useEffect(() => {
    if (busqProducto.trim().length < 2) { setMostrarSugerP(false); return }
    const t = setTimeout(async () => {
      try {
        const data = await productosApi.buscar(busqProducto)
        setSugerProductos(data)
        setMostrarSugerP(true)
      } catch (e) { console.error(e) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqProducto])

  // ── SELECCIONAR CLIENTE ───────────────────────────────────
  const seleccionarCliente = (c) => {
    setCliente(c)
    setBusqCliente(c.nombre)
    setMostrarSugerC(false)
  }

  // ── CREAR CLIENTE ─────────────────────────────────────────
  const crearCliente = async (e) => {
    e.preventDefault()
    try {
      const nuevo = await facturacionApi.crearCliente({
        ...formCliente,
        tipo_factura: tipoFactura,
      })
      setCliente(nuevo)
      setBusqCliente(nuevo.nombre)
      setModalCliente(false)
      setFormCliente({ nombre: '', cuit: '', direccion: '', telefono: '', email: '' })
    } catch (e) {
      setError(e.message)
    }
  }

  // ── AGREGAR PRODUCTO ──────────────────────────────────────
  const agregarProducto = (p) => {
    setBusqProducto('')
    setMostrarSugerP(false)
    // Si ya está en la lista, incrementar cantidad
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

  // ── CAMBIAR CANTIDAD ──────────────────────────────────────
  const cambiarCantidad = (productoId, cantidad) => {
    if (cantidad < 1) return
    setItems(items.map(i =>
      i.producto_id === productoId
        ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario }
        : i
    ))
  }

  // ── CAMBIAR PRECIO ────────────────────────────────────────
  const cambiarPrecio = (productoId, precio) => {
    setItems(items.map(i =>
      i.producto_id === productoId
        ? { ...i, precio_unitario: parseFloat(precio) || 0, subtotal: i.cantidad * (parseFloat(precio) || 0) }
        : i
    ))
  }

  // ── ELIMINAR ITEM ─────────────────────────────────────────
  const eliminarItem = (productoId) => {
    setItems(items.filter(i => i.producto_id !== productoId))
  }

  // ── CALCULAR TOTALES ──────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const iva21    = tipoFactura === 'A' ? Math.round((subtotal / 1.21) * 0.21 * 100) / 100 : 0
  const total    = subtotal

  // ── EMITIR FACTURA ────────────────────────────────────────
  const emitirFactura = async () => {
    if (!items.length) { setError('Agregá al menos un producto'); return }
    if (tipoFactura === 'A' && !cliente) { setError('Factura A requiere cliente con CUIT'); return }

    setError(null)
    setEmitiendo(true)
    try {
      const res = await facturacionApi.emitir({
        tipo:       tipoFactura,
        cliente_id: cliente?.id || null,
        items:      items.map(i => ({
          producto_id:     i.producto_id,
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      })
      setResultado(res)
      // Resetear formulario
      setItems([])
      setCliente(null)
      setBusqCliente('')
    } catch (e) {
      setError(e.message)
    } finally {
      setEmitiendo(false)
    }
  }

  // ── NUEVA FACTURA ─────────────────────────────────────────
  const nuevaFactura = () => {
    setResultado(null)
    setError(null)
    setItems([])
    setCliente(null)
    setBusqCliente('')
  }

  // ── FORMATEAR ─────────────────────────────────────────────
  const fmt     = (n) => Number(n).toLocaleString('es-AR')
  const fmtP    = (n) => `$${Number(n).toLocaleString('es-AR')}`
  const fmtF    = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—'

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.contenido}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Facturación</h2>
            <span className={styles.pageSubtitle}>Emisión de comprobantes electrónicos AFIP</span>
          </div>
          <div className={styles.modoBadge}>
            <span className={styles.modoDot}></span>
            Homologación
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
            TAB: NUEVA FACTURA
        ══════════════════════════════════════════════ */}
        {tab === 'nueva' && (

          <div>
            {/* RESULTADO — después de emitir */}
            {resultado && (
              <div className={styles.resultadoWrap}>
                <div className={styles.resultadoIcono}>✓</div>
                <div className={styles.resultadoTextos}>
                  <div className={styles.resultadoTitulo}>Factura emitida correctamente</div>
                  <div className={styles.resultadoGrid}>
                    <div className={styles.resultadoItem}>
                      <span>Número</span>
                      <strong>{resultado.numero}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Tipo</span>
                      <strong>Factura {resultado.tipo}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>CAE</span>
                      <strong>{resultado.cae}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Vto. CAE</span>
                      <strong>{resultado.cae_vto}</strong>
                    </div>
                    <div className={styles.resultadoItem}>
                      <span>Total</span>
                      <strong className={styles.resultadoTotal}>{fmtP(resultado.total)}</strong>
                    </div>
                  </div>
                </div>
                <button className={styles.btnNuevaFactura} onClick={nuevaFactura}>
                  + Nueva factura
                </button>
              </div>
            )}

            {!resultado && (
              <div className={styles.mainGrid}>

                {/* PANEL IZQUIERDO — FORMULARIO */}
                <div className={styles.formPanel}>

                  {/* TIPO DE FACTURA */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Tipo de comprobante</div>
                    <div className={styles.tipoWrap}>
                      <button
                        className={`${styles.tipoBtn} ${tipoFactura === 'B' ? styles.tipoBtnActivo : ''}`}
                        onClick={() => setTipoFactura('B')}
                      >
                        <span className={styles.tipoBtnLetra}>B</span>
                        <span className={styles.tipoBtnDesc}>Consumidor final / Monotributista</span>
                      </button>
                      <button
                        className={`${styles.tipoBtn} ${tipoFactura === 'A' ? styles.tipoBtnActivo : ''}`}
                        onClick={() => setTipoFactura('A')}
                      >
                        <span className={styles.tipoBtnLetra}>A</span>
                        <span className={styles.tipoBtnDesc}>Responsable Inscripto con CUIT</span>
                      </button>
                    </div>
                  </div>

                  {/* CLIENTE */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTituloRow}>
                      <span className={styles.seccionTitulo}>
                        Cliente {tipoFactura === 'A' ? '*' : '(opcional)'}
                      </span>
                      <button
                        className={styles.btnClienteNuevo}
                        onClick={() => setModalCliente(true)}
                      >
                        + Nuevo
                      </button>
                    </div>
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
                            <li key={c.id} className={styles.sugerItem} onClick={() => seleccionarCliente(c)}>
                              <span className={styles.sugerNombre}>{c.nombre}</span>
                              {c.cuit && <span className={styles.sugerSub}>CUIT: {c.cuit}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {cliente && (
                      <div className={styles.clienteInfo}>
                        <span className={styles.clienteAvatar}>{cliente.nombre.charAt(0)}</span>
                        <div className={styles.clienteDatos}>
                          <span className={styles.clienteNombre}>{cliente.nombre}</span>
                          {cliente.cuit && <span className={styles.clienteCuit}>CUIT: {cliente.cuit}</span>}
                        </div>
                        <button className={styles.btnQuitarCliente} onClick={() => { setCliente(null); setBusqCliente('') }}>✕</button>
                      </div>
                    )}
                    {!cliente && tipoFactura === 'B' && (
                      <div className={styles.consumidorFinal}>
                        <span>○ Sin cliente → se emite como Consumidor Final</span>
                      </div>
                    )}
                  </div>

                  {/* PRODUCTOS */}
                  <div className={styles.seccion}>
                    <div className={styles.seccionTitulo}>Agregar productos</div>
                    <div className={styles.buscadorWrap}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Buscar producto por nombre o código..."
                        value={busqProducto}
                        onChange={e => setBusqProducto(e.target.value)}
                      />
                      {mostrarSugerP && sugerProductos.length > 0 && (
                        <ul className={styles.sugerencias}>
                          {sugerProductos.map(p => (
                            <li key={p.id} className={styles.sugerItem} onClick={() => agregarProducto(p)}>
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

                  {/* ERROR */}
                  {error && (
                    <div className={styles.errorMsg}>⚠ {error}</div>
                  )}

                </div>

                {/* PANEL DERECHO — DETALLE Y TOTALES */}
                <div className={styles.detallePanel}>

                  <div className={styles.detallePanelHeader}>
                    <span className={styles.panelTitulo}>Detalle de la factura</span>
                    {items.length > 0 && (
                      <span className={styles.itemsCount}>{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* ITEMS */}
                  {items.length === 0 ? (
                    <div className={styles.itemsVacio}>
                      Buscá y agregá productos para comenzar
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
                              <button
                                className={styles.btnCantidad}
                                onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}
                              >−</button>
                              <input
                                type="number"
                                className={styles.inputCantidad}
                                value={item.cantidad}
                                onChange={e => cambiarCantidad(item.producto_id, parseInt(e.target.value) || 1)}
                                min="1"
                              />
                              <button
                                className={styles.btnCantidad}
                                onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}
                              >+</button>
                            </div>
                            <div className={styles.itemPrecioWrap}>
                              <span className={styles.itemPrecioLabel}>$</span>
                              <input
                                type="number"
                                className={styles.inputPrecio}
                                value={item.precio_unitario}
                                onChange={e => cambiarPrecio(item.producto_id, e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <span className={styles.itemSubtotal}>{fmtP(item.subtotal)}</span>
                            <button
                              className={styles.btnEliminarItem}
                              onClick={() => eliminarItem(item.producto_id)}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TOTALES */}
                  {items.length > 0 && (
                    <div className={styles.totalesWrap}>
                      <div className={styles.totalRow}>
                        <span>Subtotal</span>
                        <span>{fmtP(subtotal)}</span>
                      </div>
                      {tipoFactura === 'A' && (
                        <>
                          <div className={styles.totalRow}>
                            <span>Neto gravado</span>
                            <span>{fmtP(Math.round(subtotal / 1.21 * 100) / 100)}</span>
                          </div>
                          <div className={styles.totalRow}>
                            <span>IVA 21%</span>
                            <span>{fmtP(iva21)}</span>
                          </div>
                        </>
                      )}
                      <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                        <span>Total Factura {tipoFactura}</span>
                        <span>{fmtP(total)}</span>
                      </div>

                      <button
                        className={styles.btnEmitir}
                        onClick={emitirFactura}
                        disabled={emitiendo}
                      >
                        {emitiendo ? (
                          <span className={styles.btnEmitirCargando}>
                            <span className={styles.spinner}></span>
                            Conectando con AFIP...
                          </span>
                        ) : (
                          `▶ Emitir Factura ${tipoFactura}`
                        )}
                      </button>

                      <div className={styles.afipNota}>
                        El comprobante será enviado a AFIP y recibirás el CAE al instante
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
          <div className={styles.historialWrap}>
            {cargandoHist ? (
              <div className={styles.estado}>Cargando facturas...</div>
            ) : facturas.length === 0 ? (
              <div className={styles.estado}>No hay facturas emitidas todavía</div>
            ) : (
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Tipo</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map(f => (
                    <tr key={f.id} onClick={() => setFacturaDetalle(f)} className={styles.tablaFila}>
                      <td data-label="Número" className={styles.tdNumero}>{f.numero}</td>
                      <td data-label="Tipo">
                        <span className={f.tipo === 'A' ? styles.badgeA : styles.badgeB}>
                          Factura {f.tipo}
                        </span>
                      </td>
                      <td data-label="Cliente">{f.clientes?.nombre || 'Consumidor Final'}</td>
                      <td data-label="Total" className={styles.tdTotal}>{fmtP(f.total)}</td>
                      <td data-label="Estado">
                        <span className={styles.badgeEmitida}>{f.estado}</span>
                      </td>
                      <td data-label="Fecha">{fmtF(f.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL CLIENTE NUEVO ── */}
      {modalCliente && (
        <div className={styles.modalOverlay} onClick={() => setModalCliente(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Nuevo cliente</h3>
              <button className={styles.modalCerrar} onClick={() => setModalCliente(false)}>✕</button>
            </div>
            <form onSubmit={crearCliente} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nombre / Razón social *</label>
                <input type="text" className={styles.input} required
                  value={formCliente.nombre}
                  onChange={e => setFormCliente({...formCliente, nombre: e.target.value})}
                  placeholder="Ej: Constructora Sur S.R.L." />
              </div>
              <div className={styles.formGroup}>
                <label>CUIT {tipoFactura === 'A' ? '*' : '(requerido para Factura A)'}</label>
                <input type="text" className={styles.input}
                  value={formCliente.cuit}
                  onChange={e => setFormCliente({...formCliente, cuit: e.target.value})}
                  placeholder="20-12345678-9"
                  required={tipoFactura === 'A'} />
              </div>
              <div className={styles.formGroup}>
                <label>Dirección</label>
                <input type="text" className={styles.input}
                  value={formCliente.direccion}
                  onChange={e => setFormCliente({...formCliente, direccion: e.target.value})}
                  placeholder="Av. San Martín 1234, Posadas" />
              </div>
              <div className={styles.formGroup}>
                <label>Teléfono</label>
                <input type="text" className={styles.input}
                  value={formCliente.telefono}
                  onChange={e => setFormCliente({...formCliente, telefono: e.target.value})}
                  placeholder="376 4123456" />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input type="email" className={styles.input}
                  value={formCliente.email}
                  onChange={e => setFormCliente({...formCliente, email: e.target.value})}
                  placeholder="cliente@empresa.com" />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancelar} onClick={() => setModalCliente(false)}>Cancelar</button>
                <button type="submit" className={styles.btnGuardar}>Crear cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE FACTURA ── */}
      {facturaDetalle && (
        <div className={styles.modalOverlay} onClick={() => setFacturaDetalle(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Factura {facturaDetalle.numero}</h3>
              <button className={styles.modalCerrar} onClick={() => setFacturaDetalle(null)}>✕</button>
            </div>
            <div className={styles.modalDetalleBody}>
              <div className={styles.detalleRow}>
                <span>Tipo</span><strong>Factura {facturaDetalle.tipo}</strong>
              </div>
              <div className={styles.detalleRow}>
                <span>Cliente</span><strong>{facturaDetalle.clientes?.nombre || 'Consumidor Final'}</strong>
              </div>
              {facturaDetalle.clientes?.cuit && (
                <div className={styles.detalleRow}>
                  <span>CUIT</span><strong>{facturaDetalle.clientes.cuit}</strong>
                </div>
              )}
              <div className={styles.detalleRow}>
                <span>Total</span><strong className={styles.resultadoTotal}>{fmtP(facturaDetalle.total)}</strong>
              </div>
              <div className={styles.detalleRow}>
                <span>Estado</span><strong>{facturaDetalle.estado}</strong>
              </div>
              <div className={styles.detalleRow}>
                <span>Fecha</span><strong>{fmtF(facturaDetalle.created_at)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
