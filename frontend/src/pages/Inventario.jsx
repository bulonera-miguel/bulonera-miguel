// ============================================================
// Inventario.jsx — Productos + Categorías + Ajuste de Stock
// Bulonera Miguel
// ============================================================

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { productosApi, categoriasApi, stockApi } from '../services/api'
import styles from './Inventario.module.css'

const TABS = [
  { id: 'productos',   labelDesktop: '▦ Productos',       labelMobile: '▦ Productos' },
  { id: 'categorias',  labelDesktop: '☰ Categorías',      labelMobile: '☰ Categorías' },
  { id: 'stock',       labelDesktop: '↕ Ajuste de Stock', labelMobile: '↕ Stock'      },
]

export default function Inventario() {

  const [tab, setTab] = useState('productos')

  // ══════════════════════════════════════════════════════════
  // TAB: PRODUCTOS
  // ══════════════════════════════════════════════════════════

  const [productos, setProductos]           = useState([])
  const [cargando, setCargando]             = useState(true)
  const [error, setError]                   = useState(null)
  const [busqueda, setBusqueda]             = useState('')
  const [modalAbierto, setModalAbierto]     = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [form, setForm] = useState({
    codigo: '', nombre: '', descripcion: '',
    precio: '', stock_actual: '', stock_minimo: '',
    categoria_id: ''
  })

  // ══════════════════════════════════════════════════════════
  // TAB: CATEGORÍAS
  // ══════════════════════════════════════════════════════════

  const [categorias, setCategorias]         = useState([])
  const [formCategoria, setFormCategoria]   = useState({ nombre: '' })
  const [categoriaEditar, setCategoriaEditar] = useState(null)
  const [errorCategoria, setErrorCategoria] = useState(null)
  const [guardandoCat, setGuardandoCat]     = useState(false)

  // ══════════════════════════════════════════════════════════
  // TAB: AJUSTE DE STOCK
  // ══════════════════════════════════════════════════════════

  const [criticos, setCriticos]             = useState([])
  const [cargandoStock, setCargandoStock]   = useState(false)
  const [busquedaStock, setBusquedaStock]   = useState('')
  const [sugerencias, setSugerencias]       = useState([])
  const [mostrarSuger, setMostrarSuger]     = useState(false)
  const [productoSel, setProductoSel]       = useState(null)
  const [historial, setHistorial]           = useState([])
  const [cargandoHist, setCargandoHist]     = useState(false)
  const [formStock, setFormStock]           = useState({ tipo: 'entrada', cantidad: '', motivo: '' })
  const [mensajeStock, setMensajeStock]     = useState(null)

  // ── CARGAR DATOS INICIALES ────────────────────────────────
  useEffect(() => {
    cargarProductos()
    cargarCategorias()
    cargarCriticos()
  }, [])

  const cargarProductos = async () => {
    try {
      setCargando(true)
      const data = await productosApi.listar()
      setProductos(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const cargarCategorias = async () => {
    try {
      const data = await categoriasApi.listar()
      setCategorias(data)
    } catch (e) {
      console.error(e)
    }
  }

  const cargarCriticos = async () => {
    try {
      const data = await stockApi.criticos()
      setCriticos(data)
    } catch (e) {
      console.error(e)
    }
  }

  // ── BÚSQUEDA PRODUCTOS (tab Productos) ────────────────────
  useEffect(() => {
    if (busqueda.trim() === '') { cargarProductos(); return }
    const t = setTimeout(async () => {
      try {
        setCargando(true)
        const data = await productosApi.buscar(busqueda)
        setProductos(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [busqueda])

  // ── MODAL PRODUCTO ────────────────────────────────────────
  const abrirModalCrear = () => {
    setProductoEditar(null)
    setForm({ codigo: '', nombre: '', descripcion: '', precio: '', stock_actual: '', stock_minimo: '', categoria_id: '' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (producto) => {
    setProductoEditar(producto)
    setForm({
      codigo:       producto.codigo,
      nombre:       producto.nombre,
      descripcion:  producto.descripcion || '',
      precio:       producto.precio,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      categoria_id: producto.categoria_id || ''
    })
    setModalAbierto(true)
  }

  const cerrarModal = () => { setModalAbierto(false); setProductoEditar(null) }

  const guardarProducto = async (e) => {
    e.preventDefault()
    try {
      const datos = {
        ...form,
        precio:       parseFloat(form.precio),
        stock_actual: parseInt(form.stock_actual),
        stock_minimo: parseInt(form.stock_minimo),
        categoria_id: form.categoria_id || null,
      }
      if (productoEditar) {
        const { codigo, stock_actual, ...datosActualizar } = datos
        await productosApi.actualizar(productoEditar.id, datosActualizar)
      } else {
        await productosApi.crear(datos)
      }
      cerrarModal()
      cargarProductos()
      cargarCriticos()
    } catch (e) {
      alert(e.message)
    }
  }

  const eliminarProducto = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción lo desactivará del catálogo.`)) return
    try {
      await productosApi.eliminar(id)
      cargarProductos()
    } catch (e) {
      alert(e.message)
    }
  }

  // ── CATEGORÍAS ────────────────────────────────────────────
  const guardarCategoria = async (e) => {
    e.preventDefault()
    try {
      setGuardandoCat(true)
      setErrorCategoria(null)
      if (categoriaEditar) {
        await categoriasApi.actualizar(categoriaEditar.id, formCategoria)
      } else {
        await categoriasApi.crear(formCategoria)
      }
      setFormCategoria({ nombre: '' })
      setCategoriaEditar(null)
      cargarCategorias()
    } catch (e) {
      setErrorCategoria(e.message)
    } finally {
      setGuardandoCat(false)
    }
  }

  const editarCategoria = (cat) => {
    setCategoriaEditar(cat)
    setFormCategoria({ nombre: cat.nombre })
    setErrorCategoria(null)
  }

  const eliminarCategoria = async (id, nombre) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"? Solo se puede eliminar si no tiene productos asociados.`)) return
    try {
      await categoriasApi.eliminar(id)
      cargarCategorias()
    } catch (e) {
      alert('No se puede eliminar: la categoría tiene productos asociados.')
    }
  }

  // ── AJUSTE DE STOCK ───────────────────────────────────────
  useEffect(() => {
    if (busquedaStock.trim().length < 2) { setMostrarSuger(false); return }
    const t = setTimeout(async () => {
      try {
        const data = await productosApi.buscar(busquedaStock)
        setSugerencias(data)
        setMostrarSuger(true)
      } catch (e) { console.error(e) }
    }, 350)
    return () => clearTimeout(t)
  }, [busquedaStock])

  const seleccionarProducto = async (producto) => {
    setProductoSel(producto)
    setBusquedaStock(producto.nombre)
    setMostrarSuger(false)
    try {
      setCargandoHist(true)
      const data = await stockApi.historial(producto.id)
      setHistorial(data)
    } catch (e) { console.error(e) }
    finally { setCargandoHist(false) }
  }

  const irAStockDesdeAlerta = (producto) => {
    setTab('stock')
    seleccionarProducto(producto)
  }

  const registrarMovimiento = async (e) => {
    e.preventDefault()
    if (!productoSel) { setMensajeStock({ tipo: 'error', texto: 'Seleccioná un producto primero' }); return }
    if (!formStock.cantidad || parseInt(formStock.cantidad) <= 0) {
      setMensajeStock({ tipo: 'error', texto: 'La cantidad debe ser mayor a 0' }); return
    }
    try {
      await stockApi.registrarMovimiento({
        producto_id: productoSel.id,
        tipo:        formStock.tipo,
        cantidad:    parseInt(formStock.cantidad),
        motivo:      formStock.motivo || null,
      })
      setMensajeStock({ tipo: 'ok', texto: `${formStock.tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${formStock.cantidad} unidades registrada correctamente` })
      setFormStock(prev => ({ ...prev, cantidad: '', motivo: '' }))
      await cargarProductos()
      await cargarCriticos()
      const hist = await stockApi.historial(productoSel.id)
      setHistorial(hist)
      const productosAct = await productosApi.listar()
      const prodAct = productosAct.find(p => p.id === productoSel.id)
      if (prodAct) setProductoSel(prodAct)
      setTimeout(() => setMensajeStock(null), 3000)
    } catch (e) {
      setMensajeStock({ tipo: 'error', texto: e.message })
    }
  }

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.contenido}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Inventario</h2>
            <span className={styles.pageSubtitle}>Gestión de productos, categorías y stock</span>
          </div>
          {tab === 'productos' && (
            <button className={styles.btnNuevo} onClick={abrirModalCrear}>
              + Nuevo producto
            </button>
          )}
        </div>

        {/* TABS */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActivo : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className={styles.tabLabelDesktop}>{t.labelDesktop}</span>
              <span className={styles.tabLabelMobile}>{t.labelMobile}</span>
              {t.id === 'stock' && criticos.length > 0 && (
                <span className={styles.tabBadge}>{criticos.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══════ TAB: PRODUCTOS ══════ */}
        {tab === 'productos' && (
          <div>
            {error && <div className={styles.errorMsg}>⚠ {error}</div>}

            <div className={styles.buscadorWrap}>
              <input
                type="text"
                className={styles.buscadorInput}
                placeholder="Buscar producto por nombre o código..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className={styles.buscadorLimpiar} onClick={() => setBusqueda('')}>✕</button>
              )}
            </div>

            {cargando ? (
              <div className={styles.estado}>
                <div className={styles.spinner}></div>
                Cargando productos...
              </div>
            ) : productos.length === 0 ? (
              <div className={styles.estado}>No se encontraron productos.</div>
            ) : (
                <>
                    <table className={styles.tabla}>
                    <thead>
                        <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th className={styles.thRight}>Precio</th>
                        <th className={styles.thCenter}>Stock</th>
                        <th className={styles.thCenter}>Mínimo</th>
                        <th className={styles.thCenter}>Estado</th>
                        <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.map(p => (
                        <tr key={p.id} className={p.stock_actual <= p.stock_minimo ? styles.filaCritica : ''}>
                            <td className={styles.tdCodigo}>{p.codigo}</td>
                            <td>{p.nombre}</td>
                            <td className={styles.tdSub}>{p.categorias?.nombre || '—'}</td>
                            <td className={styles.tdRight}>${p.precio.toLocaleString('es-AR')}</td>
                            <td className={`${styles.tdCenter} ${p.stock_actual <= p.stock_minimo ? styles.stockCritico : styles.stockOk}`}>
                            {p.stock_actual}
                            </td>
                            <td className={styles.tdCenter}>{p.stock_minimo}</td>
                            <td className={styles.tdCenter}>
                            {p.stock_actual <= p.stock_minimo
                                ? <span className={styles.badgeCritico}>⚠ Crítico</span>
                                : <span className={styles.badgeOk}>✓ Normal</span>}
                            </td>
                            <td className={styles.tdAcciones}>
                            <button className={styles.btnEditar} onClick={() => abrirModalEditar(p)}>Editar</button>
                            <button className={styles.btnEliminar} onClick={() => eliminarProducto(p.id, p.nombre)}>Eliminar</button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>

                    {/* TARJETAS MOBILE */}
                    <div className={styles.tarjetasList}>
                    {productos.map(p => (
                        <div key={p.id} className={`${styles.tarjeta} ${p.stock_actual <= p.stock_minimo ? styles.tarjetaCritica : ''}`}>
                        <div className={styles.tarjetaTop}>
                            <span className={styles.tarjetaCodigo}>{p.codigo}</span>
                            <span className={p.stock_actual <= p.stock_minimo ? styles.badgeCritico : styles.badgeOk}>
                            {p.stock_actual <= p.stock_minimo ? '⚠ Crítico' : '✓ Normal'}
                            </span>
                        </div>
                        <div className={styles.tarjetaNombre}>{p.nombre}</div>
                        <div className={styles.tarjetaDatos}>
                            <div className={styles.tarjetaDato}>
                            <span>Categoría</span>
                            <strong>{p.categorias?.nombre || '—'}</strong>
                            </div>
                            <div className={styles.tarjetaDato}>
                            <span>Precio</span>
                            <strong>${p.precio.toLocaleString('es-AR')}</strong>
                            </div>
                            <div className={styles.tarjetaDato}>
                            <span>Stock</span>
                            <strong className={p.stock_actual <= p.stock_minimo ? styles.stockCritico : styles.stockOk}>
                                {p.stock_actual}
                            </strong>
                            </div>
                            <div className={styles.tarjetaDato}>
                            <span>Mínimo</span>
                            <strong>{p.stock_minimo}</strong>
                            </div>
                        </div>
                        <div className={styles.tarjetaAcciones}>
                            <button className={styles.btnEditar} onClick={() => abrirModalEditar(p)}>✎ Editar</button>
                            <button className={styles.btnEliminar} onClick={() => eliminarProducto(p.id, p.nombre)}>✕ Eliminar</button>
                        </div>
                        </div>
                    ))}
                    </div>
                </>
            )}
          </div>
        )}

        {/* ══════ TAB: CATEGORÍAS ══════ */}
        {tab === 'categorias' && (
          <div className={styles.categoriasWrap}>

            {/* Formulario alta/edición */}
            <div className={styles.catFormPanel}>
              <div className={styles.catFormTitulo}>
                {categoriaEditar ? 'Editar categoría' : 'Nueva categoría'}
              </div>
              <form onSubmit={guardarCategoria} className={styles.catForm}>
                <input
                  type="text"
                  className={styles.catInput}
                  placeholder="Nombre de la categoría..."
                  value={formCategoria.nombre}
                  onChange={e => setFormCategoria({ nombre: e.target.value })}
                  required
                />
                <button type="submit" className={styles.btnConfirmar} disabled={guardandoCat}>
                  {guardandoCat ? 'Guardando...' : categoriaEditar ? '✓ Guardar' : '+ Agregar'}
                </button>
                {categoriaEditar && (
                  <button type="button" className={styles.btnCancelar}
                    onClick={() => { setCategoriaEditar(null); setFormCategoria({ nombre: '' }) }}>
                    Cancelar
                  </button>
                )}
              </form>
              {errorCategoria && <div className={styles.errorMsg}>⚠ {errorCategoria}</div>}
            </div>

            {/* Lista de categorías */}
            {categorias.length === 0 ? (
              <div className={styles.estado}>No hay categorías creadas todavía</div>
            ) : (
              <div className={styles.catLista}>
                {categorias.map(cat => (
                  <div key={cat.id} className={styles.catItem}>
                    <span className={styles.catNombre}>{cat.nombre}</span>
                    <div className={styles.catAcciones}>
                      <button className={styles.btnEditar} onClick={() => editarCategoria(cat)}>Editar</button>
                      <button className={styles.btnEliminar} onClick={() => eliminarCategoria(cat.id, cat.nombre)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ TAB: AJUSTE DE STOCK ══════ */}
        {tab === 'stock' && (
          <div>

            {/* Alertas stock crítico */}
            {criticos.length > 0 && (
              <div className={styles.alertasWrap}>
                <div className={styles.alertasTitulo}>
                  ⚠ Stock crítico — {criticos.length} {criticos.length === 1 ? 'producto' : 'productos'}
                </div>
                <div className={styles.alertasGrid}>
                  {criticos.map(p => (
                    <div key={p.id} className={styles.alertaCard}
                      onClick={() => irAStockDesdeAlerta(p)}
                      title="Clic para seleccionar y reponer">
                      <div className={styles.alertaCardNombre}>{p.nombre}</div>
                      <div className={styles.alertaCardStock}>
                        <span className={styles.stockCritico}>{p.stock_actual}</span>
                        <span className={styles.alertaCardSep}>/</span>
                        <span className={styles.stockMinimo}>{p.stock_minimo} mín.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.stockGrid}>

              {/* Formulario movimiento */}
              <div className={styles.stockFormPanel}>
                <div className={styles.stockPanelTitulo}>Registrar movimiento manual</div>

                <form onSubmit={registrarMovimiento} className={styles.stockForm}>

                  <div className={styles.stockFormGrupo}>
                    <label>Producto *</label>
                    <div className={styles.stockBuscadorWrap}>
                      <input
                        type="text"
                        className={styles.stockBuscador}
                        placeholder="Escribí el nombre del producto..."
                        value={busquedaStock}
                        onChange={e => {
                          setBusquedaStock(e.target.value)
                          if (!e.target.value) { setProductoSel(null); setHistorial([]) }
                        }}
                      />
                      {mostrarSuger && sugerencias.length > 0 && (
                        <ul className={styles.sugerencias}>
                          {sugerencias.map(p => (
                            <li key={p.id} className={styles.sugerItem}
                              onClick={() => seleccionarProducto(p)}>
                              <span className={styles.sugerNombre}>{p.nombre}</span>
                              <span className={styles.sugerStock}>Stock: {p.stock_actual}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {productoSel && (
                    <div className={styles.productoInfo}>
                      <div className={styles.productoInfoItem}>
                        <span>Código</span><strong>{productoSel.codigo}</strong>
                      </div>
                      <div className={styles.productoInfoItem}>
                        <span>Stock actual</span>
                        <strong className={productoSel.stock_actual <= productoSel.stock_minimo ? styles.stockCritico : styles.stockOk}>
                          {productoSel.stock_actual} uds.
                        </strong>
                      </div>
                      <div className={styles.productoInfoItem}>
                        <span>Stock mínimo</span><strong>{productoSel.stock_minimo} uds.</strong>
                      </div>
                      <div className={styles.productoInfoItem}>
                        <span>Precio</span><strong>${productoSel.precio.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  )}

                  <div className={styles.tipoWrap}>
                    <button type="button"
                      className={`${styles.tipoBtn} ${formStock.tipo === 'entrada' ? styles.tipoBtnActivo : ''}`}
                      onClick={() => setFormStock({ ...formStock, tipo: 'entrada' })}>
                      ↑ Entrada
                    </button>
                    <button type="button"
                      className={`${styles.tipoBtn} ${formStock.tipo === 'salida' ? styles.tipoBtnSalidaActivo : ''}`}
                      onClick={() => setFormStock({ ...formStock, tipo: 'salida' })}>
                      ↓ Salida
                    </button>
                  </div>

                  <div className={styles.stockFormGrupo}>
                    <label>Cantidad *</label>
                    <input type="number" className={styles.stockInput}
                      value={formStock.cantidad}
                      onChange={e => setFormStock({ ...formStock, cantidad: e.target.value })}
                      min="1" placeholder="0" required />
                  </div>

                  <div className={styles.stockFormGrupo}>
                    <label>Motivo</label>
                    <input type="text" className={styles.stockInput}
                      value={formStock.motivo}
                      onChange={e => setFormStock({ ...formStock, motivo: e.target.value })}
                      placeholder="Ej: Rotura, corrección de inventario..." />
                  </div>

                  {mensajeStock && (
                    <div className={mensajeStock.tipo === 'ok' ? styles.mensajeOk : styles.mensajeError}>
                      {mensajeStock.texto}
                    </div>
                  )}

                  <button type="submit" className={styles.btnConfirmar}>
                    Confirmar movimiento
                  </button>
                </form>
              </div>

              {/* Historial */}
              <div className={styles.historialPanel}>
                <div className={styles.stockPanelTitulo}>
                  {productoSel ? `Historial — ${productoSel.nombre}` : 'Historial de movimientos'}
                </div>
                {!productoSel ? (
                  <div className={styles.historialVacio}>Seleccioná un producto para ver su historial</div>
                ) : cargandoHist ? (
                  <div className={styles.historialVacio}>Cargando...</div>
                ) : historial.length === 0 ? (
                  <div className={styles.historialVacio}>Sin movimientos registrados</div>
                ) : (
                  <div className={styles.historialList}>
                    {historial.map(m => (
                      <div key={m.id} className={styles.historialItem}>
                        <div className={styles.historialLeft}>
                          <span className={m.tipo === 'entrada' ? styles.tipoEntrada : styles.tipoSalida}>
                            {m.tipo === 'entrada' ? '↑' : '↓'} {m.tipo.toUpperCase()}
                          </span>
                          <span className={styles.historialMotivo}>{m.motivo || 'Sin motivo'}</span>
                        </div>
                        <div className={styles.historialRight}>
                          <span className={styles.historialCantidad}>
                            {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad} uds.
                          </span>
                          <span className={styles.historialFecha}>{formatearFecha(m.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ══ MODAL: NUEVO / EDITAR PRODUCTO ══ */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{productoEditar ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button className={styles.modalCerrar} onClick={cerrarModal}>✕</button>
            </div>
            <form onSubmit={guardarProducto} className={styles.modalBody}>
              <div className={styles.formGrid}>

                <div className={styles.formGrupo}>
                  <label>Código *</label>
                  <input type="text" className={styles.input}
                    value={form.codigo}
                    onChange={e => setForm({ ...form, codigo: e.target.value })}
                    disabled={!!productoEditar}
                    required placeholder="Ej: BUL-M10-50" />
                </div>

                <div className={styles.formGrupo}>
                  <label>Categoría</label>
                  <select className={styles.input}
                    value={form.categoria_id}
                    onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                <div className={`${styles.formGrupo} ${styles.fullWidth}`}>
                  <label>Nombre *</label>
                  <input type="text" className={styles.input}
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    required placeholder="Ej: Bulón hexagonal M10 x 50mm zinc" />
                </div>

                <div className={`${styles.formGrupo} ${styles.fullWidth}`}>
                  <label>Descripción</label>
                  <textarea className={styles.textarea}
                    value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Descripción opcional del producto"
                    rows={2} />
                </div>

                <div className={styles.formGrupo}>
                  <label>Precio *</label>
                  <input type="number" className={styles.input}
                    value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })}
                    required min="0" step="0.01" placeholder="0.00" />
                </div>

                <div className={styles.formGrupo}>
                  <label>Stock inicial</label>
                  <input type="number" className={styles.input}
                    value={form.stock_actual}
                    onChange={e => setForm({ ...form, stock_actual: e.target.value })}
                    disabled={!!productoEditar}
                    min="0" placeholder="0" />
                  {productoEditar && (
                    <small className={styles.inputHint}>Modificar desde "Ajuste de Stock"</small>
                  )}
                </div>

                <div className={styles.formGrupo}>
                  <label>Stock mínimo *</label>
                  <input type="number" className={styles.input}
                    value={form.stock_minimo}
                    onChange={e => setForm({ ...form, stock_minimo: e.target.value })}
                    required min="0" placeholder="0" />
                </div>

              </div>

              <div className={styles.modalAcciones}>
                <button type="button" className={styles.btnCancelar} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className={styles.btnConfirmar}>
                  {productoEditar ? '✓ Guardar cambios' : '✓ Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
