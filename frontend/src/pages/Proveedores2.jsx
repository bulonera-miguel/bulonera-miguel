// ============================================================
// Proveedores.jsx — Gestión de proveedores + Cuenta Corriente
// Bulonera Miguel
// ============================================================

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { proveedoresApi } from '../services/api'
import styles from './Proveedores.module.css'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { id: 'proveedores',       label: '≡ Proveedores'       },
  { id: 'cuenta-corriente',  label: '$ Cuenta Corriente'  },
]

const UMBRAL_ATENCION = 20000
const UMBRAL_CRITICO  = 50000

export default function Proveedores() {

  // ══════════════════════════════════════════════════════════
  // TAB: PROVEEDORES
  // ══════════════════════════════════════════════════════════

  const [tab, setTab]                         = useState('proveedores')
  const [proveedores, setProveedores]         = useState([])
  const [cargando, setCargando]               = useState(true)
  const [error, setError]                     = useState(null)
  const [busqueda, setBusqueda]               = useState('')
  const [modalAbierto, setModalAbierto]       = useState(false)
  const [proveedorEditar, setProveedorEditar] = useState(null)
  const [form, setForm] = useState({
    nombre: '', cuit: '', direccion: '', telefono: '', email: '',
    tiene_cuenta_corriente: false
  })

  // ══════════════════════════════════════════════════════════
  // TAB: CUENTA CORRIENTE
  // ══════════════════════════════════════════════════════════

  const [proveedoresCC, setProveedoresCC]     = useState([])
  const [cargandoCC, setCargandoCC]           = useState(false)
  const [errorCC, setErrorCC]                 = useState(null)
  const [proveedorCC, setProveedorCC]         = useState(null)
  const [detalle, setDetalle]                 = useState(null)
  const [cargandoDet, setCargandoDet]         = useState(false)
  const [filtroDesde, setFiltroDesde]         = useState('')
  const [filtroHasta, setFiltroHasta]         = useState('')
  const [modalPago, setModalPago]             = useState(false)
  const [pago, setPago]                       = useState({
    monto: '', fecha: new Date().toISOString().split('T')[0],
    medio_pago: 'efectivo', observaciones: ''
  })
  const [guardandoPago, setGuardandoPago]     = useState(false)
  const [errorPago, setErrorPago]             = useState(null)
  const [pagoOk, setPagoOk]                  = useState(null)

  // ── CARGAR PROVEEDORES ────────────────────────────────────
  useEffect(() => { cargarProveedores() }, [])

  const cargarProveedores = async () => {
    try {
      setCargando(true)
      const data = await proveedoresApi.listar()
      setProveedores(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  // Búsqueda con debounce
  useEffect(() => {
    if (busqueda.trim() === '') { cargarProveedores(); return }
    const t = setTimeout(async () => {
      try {
        setCargando(true)
        const data = await proveedoresApi.buscar(busqueda)
        setProveedores(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [busqueda])

  // ── MODAL PROVEEDOR ───────────────────────────────────────
  const abrirModalCrear = () => {
    setProveedorEditar(null)
    setForm({ nombre: '', cuit: '', direccion: '', telefono: '', email: '' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (p) => {
    setProveedorEditar(p)
    setForm({
      nombre:    p.nombre,
      cuit:      p.cuit      || '',
      direccion: p.direccion || '',
      telefono:  p.telefono  || '',
      email:     p.email     || '',
      tiene_cuenta_corriente: p.tiene_cuenta_corriente || false,
    })
    setModalAbierto(true)
  }

  const cerrarModal = () => { setModalAbierto(false); setProveedorEditar(null) }

  const guardarProveedor = async (e) => {
    e.preventDefault()
    try {
      const datos = {
        nombre:    form.nombre,
        cuit:      form.cuit      || null,
        direccion: form.direccion || null,
        telefono:  form.telefono  || null,
        email:     form.email     || null,
        tiene_cuenta_corriente: form.tiene_cuenta_corriente,
      }
      if (proveedorEditar) {
        await proveedoresApi.actualizar(proveedorEditar.id, datos)
      } else {
        await proveedoresApi.crear(datos)
      }
      cerrarModal()
      cargarProveedores()
    } catch (e) {
      alert(e.message)
    }
  }

  const eliminarProveedor = async (id, nombre) => {
    if (!confirm(`¿Eliminar el proveedor "${nombre}"?`)) return
    try {
      await proveedoresApi.eliminar(id)
      cargarProveedores()
    } catch (e) {
      alert(e.message)
    }
  }

  // ── CARGAR CUENTA CORRIENTE ───────────────────────────────
  const cargarProveedoresCC = async () => {
    try {
      setCargandoCC(true)
      setErrorCC(null)
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente-proveedores/`)
      if (!res.ok) throw new Error('Error al cargar')
      setProveedoresCC(await res.json())
    } catch (e) {
      setErrorCC(e.message)
    } finally {
      setCargandoCC(false)
    }
  }

  useEffect(() => {
    if (tab === 'cuenta-corriente') cargarProveedoresCC()
  }, [tab])

  // ── CARGAR DETALLE ────────────────────────────────────────
  const cargarDetalle = async (proveedor, desde = '', hasta = '') => {
    try {
      setCargandoDet(true)
      setDetalle(null)
      const p = new URLSearchParams()
      if (desde) p.append('desde', desde)
      if (hasta) p.append('hasta', hasta)
      const qs = p.toString()
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente-proveedores/${proveedor.id}${qs ? '?' + qs : ''}`)
      if (!res.ok) throw new Error('Error al cargar detalle')
      setDetalle(await res.json())
    } catch (e) {
      setErrorCC(e.message)
    } finally {
      setCargandoDet(false)
    }
  }

  const seleccionarProveedorCC = (proveedor) => {
    setProveedorCC(proveedor)
    setFiltroDesde('')
    setFiltroHasta('')
    setPagoOk(null)
    cargarDetalle(proveedor)
  }

  const volverALista = () => {
    setProveedorCC(null)
    setDetalle(null)
    setPagoOk(null)
    cargarProveedoresCC()
  }

  // ── REGISTRAR PAGO ────────────────────────────────────────
  const registrarPago = async () => {
    if (!pago.monto || parseFloat(pago.monto) <= 0) {
      setErrorPago('Ingresá un monto válido')
      return
    }
    try {
      setGuardandoPago(true)
      setErrorPago(null)
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente-proveedores/${proveedorCC.id}/pagos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          monto:         parseFloat(pago.monto),
          fecha:         pago.fecha,
          medio_pago:    pago.medio_pago,
          observaciones: pago.observaciones || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Error al registrar pago')
      }
      const data = await res.json()
      setPagoOk(data)
      setModalPago(false)
      setPago({ monto: '', fecha: new Date().toISOString().split('T')[0], medio_pago: 'efectivo', observaciones: '' })
      await cargarDetalle(proveedorCC, filtroDesde, filtroHasta)
      await cargarProveedoresCC()
      const lista = await fetch(`${BASE_URL}/api/cuenta-corriente-proveedores/`).then(r => r.json())
      const nuevo = lista.find(c => c.id === proveedorCC.id)
      if (nuevo) setProveedorCC(nuevo)
    } catch (e) {
      setErrorPago(e.message)
    } finally {
      setGuardandoPago(false)
    }
  }

  // ── FORMATEO ──────────────────────────────────────────────
  const fmtP = (n) => `$${Number(n).toLocaleString('es-AR')}`
  const fmtF = (f) => {
    if (!f) return '—'
    try { return new Date(f + 'T00:00:00').toLocaleDateString('es-AR') } catch { return f }
  }

  const estadoDeuda = (saldo) => {
    if (saldo <= 0)              return { label: '↑ A favor',  cls: styles.badgeAFavor  }
    if (saldo < UMBRAL_ATENCION) return { label: '✓ Normal',   cls: styles.badgeNormal  }
    if (saldo < UMBRAL_CRITICO)  return { label: '⚠ Atención', cls: styles.badgeAtencion }
    return                              { label: '✕ Crítico',  cls: styles.badgeCritico  }
  }

  const BadgeEstado = ({ saldo }) => {
    const e = estadoDeuda(saldo)
    return <span className={`${styles.badge} ${e.cls}`}>{e.label}</span>
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.contenido}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Proveedores</h2>
            <span className={styles.pageSubtitle}>
              {tab === 'proveedores'
                ? 'Alta, edición y gestión de proveedores'
                : proveedorCC
                  ? `Cuenta corriente — ${proveedorCC.nombre}`
                  : 'Deudas y pagos a proveedores'}
            </span>
          </div>
          {tab === 'proveedores' && (
            <button className={styles.btnNuevo} onClick={abrirModalCrear}>
              + Nuevo proveedor
            </button>
          )}
          {tab === 'cuenta-corriente' && proveedorCC && (
            <button className={styles.btnPagar} onClick={() => { setModalPago(true); setErrorPago(null) }}>
              + Registrar pago
            </button>
          )}
        </div>

        {/* TABS */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActivo : ''}`}
              onClick={() => {
                setTab(t.id)
                if (t.id === 'proveedores') { setProveedorCC(null); setDetalle(null) }
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ TAB: PROVEEDORES ══════ */}
        {tab === 'proveedores' && (
          <div>
            {error && <div className={styles.errorMsg}>⚠ {error}</div>}

            <div className={styles.buscadorWrap}>
              <input
                type="text"
                className={styles.buscadorInput}
                placeholder="Buscar proveedor por nombre..."
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
                Cargando proveedores...
              </div>
            ) : proveedores.length === 0 ? (
              <div className={styles.estado}>No se encontraron proveedores.</div>
            ) : (
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>CUIT</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Dirección</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map(p => (
                    <tr key={p.id} className={styles.tablaFila}>
                      <td className={styles.tdNombre}>{p.nombre}</td>
                      <td className={styles.tdSub}>{p.cuit || '—'}</td>
                      <td className={styles.tdSub}>{p.telefono || '—'}</td>
                      <td className={styles.tdSub}>{p.email || '—'}</td>
                      <td className={styles.tdSub}>{p.direccion || '—'}</td>
                      <td className={styles.tdAcciones}>
                        <button className={styles.btnEditar} onClick={() => abrirModalEditar(p)}>
                          ✎ Editar
                        </button>
                        <button className={styles.btnEliminar} onClick={() => eliminarProveedor(p.id, p.nombre)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══════ TAB: CUENTA CORRIENTE ══════ */}
        {tab === 'cuenta-corriente' && (
          <div>
            {!proveedorCC ? (
              // ── LISTA CC ──────────────────────────────────────
              <div>
                {errorCC && <div className={styles.errorMsg}>⚠ {errorCC}</div>}

                <div className={styles.leyenda}>
                  <span className={`${styles.badge} ${styles.badgeNormal}`}>✓ Normal &lt; $20.000</span>
                  <span className={`${styles.badge} ${styles.badgeAtencion}`}>⚠ Atención &lt; $50.000</span>
                  <span className={`${styles.badge} ${styles.badgeCritico}`}>✕ Crítico ≥ $50.000</span>
                </div>

                {cargandoCC ? (
                  <div className={styles.estado}>
                    <div className={styles.spinner}></div>
                    Cargando...
                  </div>
                ) : proveedoresCC.length === 0 ? (
                  <div className={styles.estado}>
                    No hay compras registradas con proveedores todavía.
                    <div className={styles.estadoSub}>
                      Registrá una compra desde la sección Compras para que aparezca acá.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* KPIs */}
                    <div className={styles.kpiRow}>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Proveedores con deuda</span>
                        <span className={styles.kpiValor} style={{ color: '#00C8F0' }}>
                          {proveedoresCC.filter(p => p.saldo > 0).length}
                        </span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Deuda total</span>
                        <span className={styles.kpiValor} style={{ color: '#FFB800' }}>
                          {fmtP(proveedoresCC.filter(p => p.saldo > 0).reduce((s, p) => s + p.saldo, 0))}
                        </span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>En crítico</span>
                        <span className={styles.kpiValor} style={{ color: '#FF4444' }}>
                          {proveedoresCC.filter(p => p.estado === 'critico').length}
                        </span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Total pagado</span>
                        <span className={styles.kpiValor} style={{ color: '#00E87A' }}>
                          {fmtP(proveedoresCC.reduce((s, p) => s + p.total_pagos, 0))}
                        </span>
                      </div>
                    </div>

                    <table className={styles.tabla}>
                      <thead>
                        <tr>
                          <th>Proveedor</th>
                          <th>CUIT</th>
                          <th className={styles.thCenter}>Compras</th>
                          <th className={styles.thRight}>Total comprado</th>
                          <th className={styles.thRight}>Total pagado</th>
                          <th className={styles.thRight}>Saldo</th>
                          <th className={styles.thCenter}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proveedoresCC.map(p => (
                          <tr key={p.id} className={styles.tablaFila} onClick={() => seleccionarProveedorCC(p)}>
                            <td className={styles.tdNombre}>{p.nombre}</td>
                            <td className={styles.tdSub}>{p.cuit || '—'}</td>
                            <td className={styles.tdCenter}>{p.cant_compras}</td>
                            <td className={styles.tdRight}>{fmtP(p.total_compras)}</td>
                            <td className={styles.tdRight} style={{ color: '#00E87A' }}>{fmtP(p.total_pagos)}</td>
                            <td className={styles.tdRight}>
                              <span className={p.saldo > 0 ? styles.saldoDeudor : styles.saldoAFavor}>
                                {p.saldo < 0 ? `+${fmtP(Math.abs(p.saldo))}` : fmtP(p.saldo)}
                              </span>
                            </td>
                            <td className={styles.tdCenter}><BadgeEstado saldo={p.saldo} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            ) : (
              // ── DETALLE CC ─────────────────────────────────────
              <div>
                <div className={styles.detalleHeader}>
                  <button className={styles.btnVolver} onClick={volverALista}>← Volver</button>
                  <div className={styles.detalleProvInfo}>
                    <span className={styles.detalleNombre}>{proveedorCC.nombre}</span>
                    {proveedorCC.cuit && <span className={styles.detalleSub}>CUIT: {proveedorCC.cuit}</span>}
                  </div>
                  {detalle && (
                    <div className={styles.detalleSaldoWrap}>
                      <BadgeEstado saldo={detalle.saldo} />
                      <span className={`${styles.detalleSaldo} ${detalle.saldo < 0 ? styles.saldoAFavor : detalle.saldo === 0 ? styles.saldoCero : styles.saldoDeudor}`}>
                        {detalle.saldo < 0
                          ? `+${fmtP(Math.abs(detalle.saldo))} a favor`
                          : detalle.saldo === 0 ? 'Sin deuda'
                          : `Debemos: ${fmtP(detalle.saldo)}`}
                      </span>
                    </div>
                  )}
                </div>

                {pagoOk && (
                  <div className={styles.pagoOkMsg}>
                    ✓ Pago de {fmtP(pagoOk.monto)} registrado correctamente el {fmtF(pagoOk.fecha)}
                  </div>
                )}

                {/* Filtros */}
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
                    onClick={() => cargarDetalle(proveedorCC, filtroDesde, filtroHasta)}>
                    ▶ Filtrar
                  </button>
                  <button className={styles.btnLimpiarFiltro}
                    onClick={() => { setFiltroDesde(''); setFiltroHasta(''); cargarDetalle(proveedorCC) }}>
                    ✕ Limpiar
                  </button>
                </div>

                {cargandoDet ? (
                  <div className={styles.estado}><div className={styles.spinner}></div>Cargando movimientos...</div>
                ) : detalle && (
                  <div className={styles.detalleGrid}>

                    {/* Compras */}
                    <div className={styles.detallePanel}>
                      <div className={styles.detallePanelHeader}>
                        <span className={styles.panelTitulo}>Compras realizadas</span>
                        <span className={styles.panelContador}>{detalle.compras?.length || 0} registros</span>
                      </div>
                      {!detalle.compras?.length ? (
                        <div className={styles.tablaVacia}>Sin compras en el período</div>
                      ) : (
                        <table className={styles.tablaInterna}>
                          <thead>
                            <tr>
                              <th>Número</th>
                              <th>Fecha</th>
                              <th className={styles.thRight}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle.compras.map((c, i) => (
                              <tr key={i}>
                                <td>C-{c.id?.slice(0,8).toUpperCase()}</td>
                                <td>{fmtF(c.fecha)}</td>
                                <td className={styles.tdRight} style={{ color: '#FFB800' }}>{fmtP(c.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={2} className={styles.tfootLabel}>Subtotal compras</td>
                              <td className={`${styles.tdRight} ${styles.tfootValor}`}>
                                {fmtP(detalle.compras.reduce((s, c) => s + parseFloat(c.total), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>

                    {/* Pagos */}
                    <div className={styles.detallePanel}>
                      <div className={styles.detallePanelHeader}>
                        <span className={styles.panelTitulo}>Pagos realizados</span>
                        <span className={styles.panelContador}>{detalle.pagos?.length || 0} registros</span>
                      </div>
                      {!detalle.pagos?.length ? (
                        <div className={styles.tablaVacia}>Sin pagos en el período</div>
                      ) : (
                        <table className={styles.tablaInterna}>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Medio</th>
                              <th>Obs.</th>
                              <th className={styles.thRight}>Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle.pagos.map((p, i) => (
                              <tr key={i}>
                                <td>{fmtF(p.fecha)}</td>
                                <td><span className={styles.badgeMedio}>{p.medio_pago}</span></td>
                                <td className={styles.tdObs}>{p.observaciones || '—'}</td>
                                <td className={styles.tdRight} style={{ color: '#00E87A' }}>{fmtP(p.monto)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3} className={styles.tfootLabel}>Subtotal pagos</td>
                              <td className={`${styles.tdRight} ${styles.tfootValor}`} style={{ color: '#00E87A' }}>
                                {fmtP(detalle.pagos.reduce((s, p) => s + parseFloat(p.monto), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ══ MODAL: NUEVO / EDITAR PROVEEDOR ══ */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{proveedorEditar ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
              <button className={styles.modalCerrar} onClick={cerrarModal}>✕</button>
            </div>
            <div className={styles.modalBody}>

              <div className={styles.formGrupo}>
                <label>Nombre / Razón social *</label>
                <input type="text" className={styles.input}
                  placeholder="Ej: Distribuidora San Martín S.A."
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGrupo}>
                  <label>CUIT</label>
                  <input type="text" className={styles.input}
                    placeholder="20-12345678-9"
                    value={form.cuit}
                    onChange={e => setForm({ ...form, cuit: e.target.value })} />
                </div>
                <div className={styles.formGrupo}>
                  <label>Teléfono</label>
                  <input type="text" className={styles.input}
                    placeholder="376 4123456"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>

              <div className={styles.formGrupo}>
                <label>Email</label>
                <input type="email" className={styles.input}
                  placeholder="proveedor@empresa.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className={styles.formGrupo}>
                <label>Dirección</label>
                <input type="text" className={styles.input}
                  placeholder="Av. San Martín 1234, Posadas"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>

              <div className={styles.formGrupoRow}>
                <label>Habilitar cuenta corriente</label>
                <label className={styles.toggleWrap}>
                  <input
                    type="checkbox"
                    checked={form.tiene_cuenta_corriente}
                    onChange={e => setForm({ ...form, tiene_cuenta_corriente: e.target.checked })}
                  />
                  <span className={`${styles.toggle} ${form.tiene_cuenta_corriente ? styles.toggleOn : ''}`}></span>
                </label>
              </div>

              <div className={styles.modalAcciones}>
                <button className={styles.btnCancelar} onClick={cerrarModal}>Cancelar</button>
                <button className={styles.btnConfirmar} onClick={guardarProveedor}>
                  {proveedorEditar ? '✓ Guardar cambios' : '✓ Crear proveedor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: REGISTRAR PAGO ══ */}
      {modalPago && (
        <div className={styles.modalOverlay} onClick={() => setModalPago(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Registrar pago a proveedor</h3>
              <button className={styles.modalCerrar} onClick={() => setModalPago(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalProv}>
                <span className={styles.modalProvLabel}>Proveedor</span>
                <strong style={{ color: '#00C8F0' }}>{proveedorCC?.nombre}</strong>
              </div>
              {detalle && (
                <div className={styles.modalSaldoActual}>
                  Saldo actual:
                  <strong className={detalle.saldo > 0 ? styles.saldoDeudor : styles.saldoAFavor}>
                    {detalle.saldo < 0
                      ? ` +${fmtP(Math.abs(detalle.saldo))} a favor`
                      : ` ${fmtP(detalle.saldo)} a pagar`}
                  </strong>
                </div>
              )}

              <div className={styles.formGrupo}>
                <label>Monto *</label>
                <input type="number" className={styles.input}
                  placeholder="Ej: 15000"
                  value={pago.monto}
                  onChange={e => setPago({ ...pago, monto: e.target.value })}
                  min="0" step="0.01" autoFocus />
              </div>
              <div className={styles.formGrupo}>
                <label>Fecha</label>
                <input type="date" className={styles.input}
                  value={pago.fecha}
                  onChange={e => setPago({ ...pago, fecha: e.target.value })} />
              </div>
              <div className={styles.formGrupo}>
                <label>Medio de pago</label>
                <select className={styles.input}
                  value={pago.medio_pago}
                  onChange={e => setPago({ ...pago, medio_pago: e.target.value })}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="debito">Tarjeta de débito</option>
                  <option value="credito">Tarjeta de crédito</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className={styles.formGrupo}>
                <label>Observaciones (opcional)</label>
                <textarea className={styles.textarea}
                  placeholder="Notas sobre el pago..."
                  value={pago.observaciones}
                  onChange={e => setPago({ ...pago, observaciones: e.target.value })}
                  rows={2} />
              </div>

              {errorPago && <div className={styles.errorMsg}>⚠ {errorPago}</div>}

              <div className={styles.modalAcciones}>
                <button className={styles.btnCancelar} onClick={() => setModalPago(false)}>Cancelar</button>
                <button className={styles.btnConfirmar} onClick={registrarPago} disabled={guardandoPago}>
                  {guardandoPago ? 'Guardando...' : '✓ Confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
