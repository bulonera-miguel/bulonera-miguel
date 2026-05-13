import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { stockApi, productosApi } from '../services/api'
import styles from './Stock.module.css'

export default function Stock() {

  // ── ESTADOS ────────────────────────────────────────────────
  const [criticos, setCriticos]           = useState([])
  const [productos, setProductos]         = useState([])
  const [historial, setHistorial]         = useState([])
  const [cargando, setCargando]           = useState(true)
  const [cargandoHist, setCargandoHist]   = useState(false)
  const [error, setError]                 = useState(null)
  const [busqueda, setBusqueda]           = useState('')
  const [productoSel, setProductoSel]     = useState(null)
  // productoSel: el producto seleccionado para registrar movimiento
  const [mostrarSuger, setMostrarSuger]   = useState(false)
  // mostrarSuger: controla si se muestran las sugerencias del buscador
  const [form, setForm] = useState({
    tipo: 'entrada',
    cantidad: '',
    motivo: ''
  })
  const [mensaje, setMensaje]             = useState(null)
  // mensaje: feedback al usuario después de registrar un movimiento

  // ── CARGAR DATOS AL MONTAR ─────────────────────────────────
  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setCargando(true)
      const [criticosData, productosData] = await Promise.all([
        stockApi.criticos(),
        productosApi.listar()
      ])
      // Promise.all: ejecuta las dos llamadas en paralelo
      // Es más rápido que hacerlas una por una
      setCriticos(criticosData)
      setProductos(productosData)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  // ── BUSCADOR CON DEBOUNCE ──────────────────────────────────
  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setMostrarSuger(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const data = await productosApi.buscar(busqueda)
        setProductos(data)
        setMostrarSuger(true)
      } catch (e) {
        console.error(e)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [busqueda])

  // ── SELECCIONAR PRODUCTO ───────────────────────────────────
  const seleccionarProducto = async (producto) => {
    setProductoSel(producto)
    setBusqueda(producto.nombre)
    setMostrarSuger(false)
    // Cargamos el historial de ese producto
    try {
      setCargandoHist(true)
      const data = await stockApi.historial(producto.id)
      setHistorial(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoHist(false)
    }
  }

  // ── REGISTRAR MOVIMIENTO ───────────────────────────────────
  const registrarMovimiento = async (e) => {
    e.preventDefault()
    if (!productoSel) {
      setMensaje({ tipo: 'error', texto: 'Seleccioná un producto primero' })
      return
    }
    if (!form.cantidad || parseInt(form.cantidad) <= 0) {
      setMensaje({ tipo: 'error', texto: 'La cantidad debe ser mayor a 0' })
      return
    }
    try {
      await stockApi.registrarMovimiento({
        producto_id: productoSel.id,
        tipo:        form.tipo,
        cantidad:    parseInt(form.cantidad),
        motivo:      form.motivo || null,
      })
      setMensaje({
        tipo: 'ok',
        texto: `${form.tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${form.cantidad} unidades registrada correctamente`
      })
      // Resetear formulario
      //setForm({ tipo: 'entrada', cantidad: '', motivo: '' })
      // Cambia lo de arriba por esto (mantiene el producto, resetea solo cantidad y motivo):
      setForm(prev => ({ ...prev, cantidad: '', motivo: '' }))
      // Recargar datos
      await cargarDatos()
      // Recargar historial del producto
      const hist = await stockApi.historial(productoSel.id)
      setHistorial(hist)
      // Actualizar el producto seleccionado con el nuevo stock
      const productosActualizados = await productosApi.listar()
      const productoActualizado = productosActualizados.find(p => p.id === productoSel.id)
      if (productoActualizado) setProductoSel(productoActualizado)

      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setMensaje(null), 3000)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
  }

  // ── FORMATEAR FECHA ────────────────────────────────────────
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      <Navbar />

      <div className={styles.contenido}>

        {/* ── TÍTULO DE PÁGINA ── */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Control de Stock</h2>
            <span className={styles.pageSubtitle}>Registrá entradas y salidas de mercadería</span>
          </div>
        </div>

        {/* ── ALERTAS DE STOCK CRÍTICO ── */}
        {!cargando && criticos.length > 0 && (
          <div className={styles.alertasWrap}>
            <div className={styles.alertasTitle}>
              ⚠ Productos con stock crítico — {criticos.length} {criticos.length === 1 ? 'producto' : 'productos'}
            </div>
            <div className={styles.alertasGrid}>
              {criticos.map(p => (
                <div
                  key={p.id}
                  className={styles.alertaCard}
                  onClick={() => seleccionarProducto(p)}
                  // Al hacer clic en una alerta, se selecciona ese producto
                  // en el formulario para reponer rápidamente
                >
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

        {/* ── LAYOUT PRINCIPAL: FORMULARIO + HISTORIAL ── */}
        <div className={styles.mainGrid}>

          {/* FORMULARIO DE MOVIMIENTO */}
          <div className={styles.formPanel}>
            <h3 className={styles.panelTitle}>Registrar movimiento</h3>

            <form onSubmit={registrarMovimiento} className={styles.form}>

              {/* Buscador de producto */}
              <div className={styles.formGroup}>
                <label>Producto *</label>
                <div className={styles.buscadorWrap}>
                  <input
                    type="text"
                    className={styles.buscador}
                    placeholder="Escribí el nombre del producto..."
                    value={busqueda}
                    onChange={e => {
                      setBusqueda(e.target.value)
                      if (e.target.value === '') {
                        setProductoSel(null)
                        setHistorial([])
                      }
                    }}
                  />
                  {/* Sugerencias del buscador */}
                  {mostrarSuger && productos.length > 0 && (
                    <ul className={styles.sugerencias}>
                      {productos.map(p => (
                        <li
                          key={p.id}
                          className={styles.sugerenciaItem}
                          onClick={() => seleccionarProducto(p)}
                        >
                          <span className={styles.sugerNombre}>{p.nombre}</span>
                          <span className={styles.sugerStock}>Stock: {p.stock_actual}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Producto seleccionado — muestra info del producto */}
              {productoSel && (
                <div className={styles.productoInfo}>
                  <div className={styles.productoInfoItem}>
                    <span>Código</span>
                    <strong>{productoSel.codigo}</strong>
                  </div>
                  <div className={styles.productoInfoItem}>
                    <span>Stock actual</span>
                    <strong className={
                      productoSel.stock_actual <= productoSel.stock_minimo
                        ? styles.stockCritico : styles.stockOk
                    }>
                      {productoSel.stock_actual} uds.
                    </strong>
                  </div>
                  <div className={styles.productoInfoItem}>
                    <span>Stock mínimo</span>
                    <strong>{productoSel.stock_minimo} uds.</strong>
                  </div>
                  <div className={styles.productoInfoItem}>
                    <span>Precio</span>
                    <strong>${productoSel.precio.toLocaleString('es-AR')}</strong>
                  </div>
                </div>
              )}

              {/* Tipo de movimiento */}
              <div className={styles.tipoWrap}>
                <button
                  type="button"
                  className={`${styles.tipoBtn} ${form.tipo === 'entrada' ? styles.tipoBtnActivo : ''}`}
                  onClick={() => setForm({...form, tipo: 'entrada'})}
                >
                  ↑ Entrada
                </button>
                <button
                  type="button"
                  className={`${styles.tipoBtnSalida} ${form.tipo === 'salida' ? styles.tipoBtnSalidaActivo : ''}`}
                  onClick={() => setForm({...form, tipo: 'salida'})}
                >
                  ↓ Salida
                </button>
              </div>

              {/* Cantidad */}
              <div className={styles.formGroup}>
                <label>Cantidad *</label>
                <input
                  type="number"
                  className={styles.input}
                  value={form.cantidad}
                  onChange={e => setForm({...form, cantidad: e.target.value})}
                  min="1"
                  placeholder="0"
                  required
                />
              </div>

              {/* Motivo */}
              <div className={styles.formGroup}>
                <label>Motivo</label>
                <input
                  type="text"
                  className={styles.input}
                  value={form.motivo}
                  onChange={e => setForm({...form, motivo: e.target.value})}
                  placeholder="Ej: Compra a proveedor, Venta, Ajuste..."
                />
              </div>

              {/* Mensaje de feedback */}
              {mensaje && (
                <div className={mensaje.tipo === 'ok' ? styles.mensajeOk : styles.mensajeError}>
                  {mensaje.texto}
                </div>
              )}

              <button type="submit" className={styles.btnConfirmar}>
                Confirmar movimiento
              </button>

            </form>
          </div>

          {/* HISTORIAL DE MOVIMIENTOS */}
          <div className={styles.historialPanel}>
            <h3 className={styles.panelTitle}>
              {productoSel
                ? `Historial — ${productoSel.nombre}`
                : 'Historial de movimientos'}
            </h3>

            {!productoSel ? (
              <div className={styles.historialVacio}>
                Seleccioná un producto para ver su historial
              </div>
            ) : cargandoHist ? (
              <div className={styles.historialVacio}>Cargando historial...</div>
            ) : historial.length === 0 ? (
              <div className={styles.historialVacio}>
                Este producto no tiene movimientos registrados
              </div>
            ) : (
              <div className={styles.historialList}>
                {historial.map(m => (
                  <div key={m.id} className={styles.historialItem}>
                    <div className={styles.historialItemLeft}>
                      <span className={
                        m.tipo === 'entrada' ? styles.tipoEntrada : styles.tipoSalida
                      }>
                        {m.tipo === 'entrada' ? '↑' : '↓'} {m.tipo.toUpperCase()}
                      </span>
                      <span className={styles.historialMotivo}>
                        {m.motivo || 'Sin motivo'}
                      </span>
                    </div>
                    <div className={styles.historialItemRight}>
                      <span className={styles.historialCantidad}>
                        {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad} uds.
                      </span>
                      <span className={styles.historialFecha}>
                        {formatearFecha(m.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}