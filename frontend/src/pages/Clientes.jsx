// ============================================================
// Clientes.jsx — Gestión de clientes + Cuenta Corriente
// Bulonera Miguel
// ============================================================

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import styles from './Clientes.module.css'

const BASE_URL = 'http://localhost:8000'

const TABS = [
  { id: 'clientes',          label: '≡ Clientes'         },
  { id: 'cuenta-corriente',  label: '$ Cuenta Corriente' },
]

// ── UMBRALES CUENTA CORRIENTE ─────────────────────────────
const UMBRAL_ATENCION = 20000
const UMBRAL_CRITICO  = 50000

export default function Clientes() {

  const [tab, setTab] = useState('clientes')

  // ══════════════════════════════════════════════════════════
  // TAB: CLIENTES
  // ══════════════════════════════════════════════════════════

  const [clientes, setClientes]           = useState([])
  const [cargando, setCargando]           = useState(false)
  const [busqueda, setBusqueda]           = useState('')
  const [error, setError]                 = useState(null)

  // Modal alta/edición
  const [modal, setModal]                 = useState(false)
  const [editando, setEditando]           = useState(null) // null = nuevo, objeto = editar
  const [form, setForm]                   = useState({ nombre: '', cuit: '', direccion: '', telefono: '', email: '', tipo_factura: 'B', tiene_cuenta_corriente: false })
  const [guardando, setGuardando]         = useState(false)
  const [errorForm, setErrorForm]         = useState(null)

  // ── CARGAR CLIENTES ───────────────────────────────────────
  const cargarClientes = async (q = '') => {
    try {
      setCargando(true)
      setError(null)
      const url = q.trim().length >= 2
        ? `${BASE_URL}/api/facturacion/clientes/buscar?q=${encodeURIComponent(q)}`
        : `${BASE_URL}/api/facturacion/clientes`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar clientes')
      setClientes(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarClientes() }, [])

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => cargarClientes(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  // ── ABRIR MODAL ───────────────────────────────────────────
  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', cuit: '', direccion: '', telefono: '', email: '', tipo_factura: 'B', tiene_cuenta_corriente: false })
    setErrorForm(null)
    setModal(true)
  }

  const abrirEditar = (c) => {
    setEditando(c)
    setForm({
      nombre:                  c.nombre || '',
      cuit:                    c.cuit || '',
      direccion:               c.direccion || '',
      telefono:                c.telefono || '',
      email:                   c.email || '',
      tipo_factura:            c.tipo_factura?.trim() || 'B',
      tiene_cuenta_corriente:  c.tiene_cuenta_corriente || false,
    })
    setErrorForm(null)
    setModal(true)
  }

  // ── GUARDAR CLIENTE ───────────────────────────────────────
  const guardarCliente = async () => {
    if (!form.nombre.trim()) { setErrorForm('El nombre es obligatorio'); return }
    try {
      setGuardando(true)
      setErrorForm(null)

      if (editando) {
        // Actualizar — usamos endpoint directo a Supabase vía cuenta-corriente para el toggle
        // y el endpoint de facturación para los datos base
        const res = await fetch(`${BASE_URL}/api/facturacion/clientes/${editando.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        })
        if (!res.ok) {
          // Si no existe endpoint PATCH de clientes, actualizamos lo que podemos
          // El toggle de cuenta corriente sí tiene endpoint propio
          await fetch(`${BASE_URL}/api/cuenta-corriente/${editando.id}/habilitar?habilitar=${form.tiene_cuenta_corriente}`, {
            method: 'PATCH',
          })
        }
      } else {
        // Crear nuevo — usa endpoint de facturación existente
        const res = await fetch(`${BASE_URL}/api/facturacion/clientes`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || 'Error al crear cliente')
        }
        const nuevo = await res.json()
        // Si tiene cuenta corriente, habilitarla
        if (form.tiene_cuenta_corriente) {
          await fetch(`${BASE_URL}/api/cuenta-corriente/${nuevo.id}/habilitar?habilitar=true`, {
            method: 'PATCH',
          })
        }
      }

      setModal(false)
      await cargarClientes(busqueda)
    } catch (e) {
      setErrorForm(e.message)
    } finally {
      setGuardando(false)
    }
  }

  // ── TOGGLE CUENTA CORRIENTE DIRECTO DESDE TABLA ───────────
  const toggleCuentaCorriente = async (cliente, valor) => {
    try {
      await fetch(`${BASE_URL}/api/cuenta-corriente/${cliente.id}/habilitar?habilitar=${valor}`, {
        method: 'PATCH',
      })
      setClientes(clientes.map(c =>
        c.id === cliente.id ? { ...c, tiene_cuenta_corriente: valor } : c
      ))
    } catch (e) {
      console.error(e)
    }
  }

  // ── IR A CUENTA CORRIENTE DE UN CLIENTE ──────────────────
  const verCuentaCorriente = (cliente) => {
    setClienteCC(cliente)
    setTab('cuenta-corriente')
  }

  // ══════════════════════════════════════════════════════════
  // TAB: CUENTA CORRIENTE
  // ══════════════════════════════════════════════════════════

  const [clientesCC, setClientesCC]         = useState([])
  const [cargandoCC, setCargandoCC]         = useState(false)
  const [errorCC, setErrorCC]               = useState(null)
  const [clienteCC, setClienteCC]           = useState(null)
  const [detalle, setDetalle]               = useState(null)
  const [cargandoDet, setCargandoDet]       = useState(false)
  const [filtroDesde, setFiltroDesde]       = useState('')
  const [filtroHasta, setFiltroHasta]       = useState('')
  const [modalPago, setModalPago]           = useState(false)
  const [pago, setPago]                     = useState({ monto: '', fecha: new Date().toISOString().split('T')[0], medio_pago: 'efectivo', observaciones: '' })
  const [guardandoPago, setGuardandoPago]   = useState(false)
  const [errorPago, setErrorPago]           = useState(null)
  const [pagoOk, setPagoOk]                = useState(null)

  const cargarClientesCC = async () => {
    try {
      setCargandoCC(true)
      setErrorCC(null)
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente/`)
      if (!res.ok) throw new Error('Error al cargar')
      setClientesCC(await res.json())
    } catch (e) {
      setErrorCC(e.message)
    } finally {
      setCargandoCC(false)
    }
  }

  useEffect(() => {
    if (tab === 'cuenta-corriente') cargarClientesCC()
  }, [tab])

  const cargarDetalle = async (cliente, desde = '', hasta = '') => {
    try {
      setCargandoDet(true)
      setDetalle(null)
      const p = new URLSearchParams()
      if (desde) p.append('desde', desde)
      if (hasta) p.append('hasta', hasta)
      const qs = p.toString()
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente/${cliente.id}${qs ? '?' + qs : ''}`)
      if (!res.ok) throw new Error('Error al cargar detalle')
      setDetalle(await res.json())
    } catch (e) {
      setErrorCC(e.message)
    } finally {
      setCargandoDet(false)
    }
  }

  const seleccionarClienteCC = (cliente) => {
    setClienteCC(cliente)
    setFiltroDesde('')
    setFiltroHasta('')
    setPagoOk(null)
    cargarDetalle(cliente)
  }

  const volverALista = () => {
    setClienteCC(null)
    setDetalle(null)
    setPagoOk(null)
    cargarClientesCC()
  }

  const registrarPago = async () => {
    if (!pago.monto || parseFloat(pago.monto) <= 0) {
      setErrorPago('Ingresá un monto válido')
      return
    }
    try {
      setGuardandoPago(true)
      setErrorPago(null)
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente/${clienteCC.id}/pagos`, {
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
      await cargarDetalle(clienteCC, filtroDesde, filtroHasta)
      await cargarClientesCC()
      // Actualizar clienteCC con nuevo saldo
      const lista = await fetch(`${BASE_URL}/api/cuenta-corriente/`).then(r => r.json())
      const nuevo = lista.find(c => c.id === clienteCC.id)
      if (nuevo) setClienteCC(nuevo)
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
    if (saldo <= 0)             return { label: '↑ A favor',  cls: styles.badgeAFavor  }
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
            <h2 className={styles.pageTitle}>Clientes</h2>
            <span className={styles.pageSubtitle}>
              {tab === 'clientes'
                ? 'Alta, edición y gestión de clientes'
                : clienteCC
                  ? `Cuenta corriente — ${clienteCC.nombre}`
                  : 'Deudas y pagos de clientes'}
            </span>
          </div>
          {tab === 'clientes' && (
            <button className={styles.btnNuevo} onClick={abrirNuevo}>
              + Nuevo cliente
            </button>
          )}
          {tab === 'cuenta-corriente' && clienteCC && (
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
                if (t.id === 'clientes') { setClienteCC(null); setDetalle(null) }
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ TAB: CLIENTES ══════ */}
        {tab === 'clientes' && (
          <div>
            {error && <div className={styles.errorMsg}>⚠ {error}</div>}

            {/* Buscador */}
            <div className={styles.buscadorWrap}>
              <input
                type="text"
                className={styles.buscadorInput}
                placeholder="Buscar por nombre..."
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
                Cargando clientes...
              </div>
            ) : clientes.length === 0 ? (
              <div className={styles.estado}>
                {busqueda ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados'}
              </div>
            ) : (
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>CUIT</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Tipo fact.</th>
                    <th>Cta. Cte.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id} className={styles.tablaFila}>
                      <td className={styles.tdNombre}>{c.nombre}</td>
                      <td className={styles.tdSub}>{c.cuit || '—'}</td>
                      <td className={styles.tdSub}>{c.telefono || '—'}</td>
                      <td className={styles.tdSub}>{c.email || '—'}</td>
                      <td>
                        <span className={c.tipo_factura?.trim() === 'A' ? styles.badgeTipoA : styles.badgeTipoB}>
                          Factura {c.tipo_factura?.trim() || 'B'}
                        </span>
                      </td>
                      <td className={styles.tdCenter}>
                        <label className={styles.toggleWrap} title={c.tiene_cuenta_corriente ? 'Deshabilitar cuenta corriente' : 'Habilitar cuenta corriente'}>
                          <input
                            type="checkbox"
                            checked={c.tiene_cuenta_corriente || false}
                            onChange={e => toggleCuentaCorriente(c, e.target.checked)}
                          />
                          <span className={`${styles.toggle} ${c.tiene_cuenta_corriente ? styles.toggleOn : ''}`}></span>
                        </label>
                      </td>
                      <td className={styles.tdAcciones}>
                        <button className={styles.btnEditar} onClick={() => abrirEditar(c)}>
                          ✎ Editar
                        </button>
                        {c.tiene_cuenta_corriente && (
                          <button className={styles.btnVerCC} onClick={() => verCuentaCorriente(c)}>
                            $ Ver CC
                          </button>
                        )}
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
            {!clienteCC ? (
              // ── LISTA CC ──────────────────────────────────────
              <div>
                {errorCC && <div className={styles.errorMsg}>⚠ {errorCC}</div>}

                {/* Leyenda umbrales */}
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
                ) : clientesCC.length === 0 ? (
                  <div className={styles.estado}>
                    No hay clientes con cuenta corriente habilitada.
                    <div className={styles.estadoSub}>
                      Habilitá la cuenta corriente desde la pestaña Clientes.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* KPIs */}
                    <div className={styles.kpiRow}>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Clientes activos</span>
                        <span className={styles.kpiValor} style={{ color: '#00C8F0' }}>{clientesCC.length}</span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Deuda total</span>
                        <span className={styles.kpiValor} style={{ color: '#FFB800' }}>
                          {fmtP(clientesCC.filter(c => c.saldo > 0).reduce((s, c) => s + c.saldo, 0))}
                        </span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>En crítico</span>
                        <span className={styles.kpiValor} style={{ color: '#FF4444' }}>
                          {clientesCC.filter(c => c.estado === 'critico').length}
                        </span>
                      </div>
                      <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>A favor</span>
                        <span className={styles.kpiValor} style={{ color: '#00E87A' }}>
                          {clientesCC.filter(c => c.estado === 'a_favor').length}
                        </span>
                      </div>
                    </div>

                    <table className={styles.tabla}>
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>CUIT</th>
                          <th className={styles.thCenter}>Ventas</th>
                          <th className={styles.thRight}>Total facturado</th>
                          <th className={styles.thRight}>Total pagado</th>
                          <th className={styles.thRight}>Saldo</th>
                          <th className={styles.thCenter}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientesCC.map(c => (
                          <tr key={c.id} className={styles.tablaFila} onClick={() => seleccionarClienteCC(c)}>
                            <td className={styles.tdNombre}>{c.nombre}</td>
                            <td className={styles.tdSub}>{c.cuit || '—'}</td>
                            <td className={styles.tdCenter}>{c.cant_ventas}</td>
                            <td className={styles.tdRight}>{fmtP(c.total_ventas)}</td>
                            <td className={styles.tdRight} style={{ color: '#00E87A' }}>{fmtP(c.total_pagos)}</td>
                            <td className={styles.tdRight}>
                              <span className={c.saldo > 0 ? styles.saldoDeudor : styles.saldoAFavor}>
                                {c.saldo < 0 ? `+${fmtP(Math.abs(c.saldo))}` : fmtP(c.saldo)}
                              </span>
                            </td>
                            <td className={styles.tdCenter}><BadgeEstado saldo={c.saldo} /></td>
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
                {/* Header detalle */}
                <div className={styles.detalleHeader}>
                  <button className={styles.btnVolver} onClick={volverALista}>← Volver</button>
                  <div className={styles.detalleClienteInfo}>
                    <span className={styles.detalleNombre}>{clienteCC.nombre}</span>
                    {clienteCC.cuit && <span className={styles.detalleSub}>CUIT: {clienteCC.cuit}</span>}
                  </div>
                  {detalle && (
                    <div className={styles.detalleSaldoWrap}>
                      <BadgeEstado saldo={detalle.saldo} />
                      <span className={`${styles.detalleSaldo} ${detalle.saldo < 0 ? styles.saldoAFavor : detalle.saldo === 0 ? styles.saldoCero : styles.saldoDeudor}`}>
                        {detalle.saldo < 0
                          ? `+${fmtP(Math.abs(detalle.saldo))} a favor`
                          : detalle.saldo === 0 ? 'Sin deuda'
                          : `Debe: ${fmtP(detalle.saldo)}`}
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
                    onClick={() => cargarDetalle(clienteCC, filtroDesde, filtroHasta)}>
                    ▶ Filtrar
                  </button>
                  <button className={styles.btnLimpiarFiltro}
                    onClick={() => { setFiltroDesde(''); setFiltroHasta(''); cargarDetalle(clienteCC) }}>
                    ✕ Limpiar
                  </button>
                </div>

                {cargandoDet ? (
                  <div className={styles.estado}><div className={styles.spinner}></div>Cargando movimientos...</div>
                ) : detalle && (
                  <div className={styles.detalleGrid}>

                    {/* Ventas */}
                    <div className={styles.detallePanel}>
                      <div className={styles.detallePanelHeader}>
                        <span className={styles.panelTitulo}>Ventas</span>
                        <span className={styles.panelContador}>{detalle.ventas?.length || 0} registros</span>
                      </div>
                      {!detalle.ventas?.length ? (
                        <div className={styles.tablaVacia}>Sin ventas en el período</div>
                      ) : (
                        <table className={styles.tablaInterna}>
                          <thead>
                            <tr><th>Comprobante</th><th>Fecha</th><th className={styles.thRight}>Total</th></tr>
                          </thead>
                          <tbody>
                            {detalle.ventas.map((v, i) => (
                              <tr key={i}>
                                <td>{v.numero_comprobante || `V-${v.id?.slice(0,8).toUpperCase()}`}</td>
                                <td>{fmtF(v.fecha)}</td>
                                <td className={styles.tdRight} style={{ color: '#FFB800' }}>{fmtP(v.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={2} className={styles.tfootLabel}>Subtotal ventas</td>
                              <td className={`${styles.tdRight} ${styles.tfootValor}`}>
                                {fmtP(detalle.ventas.reduce((s, v) => s + parseFloat(v.total), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>

                    {/* Pagos */}
                    <div className={styles.detallePanel}>
                      <div className={styles.detallePanelHeader}>
                        <span className={styles.panelTitulo}>Pagos recibidos</span>
                        <span className={styles.panelContador}>{detalle.pagos?.length || 0} registros</span>
                      </div>
                      {!detalle.pagos?.length ? (
                        <div className={styles.tablaVacia}>Sin pagos en el período</div>
                      ) : (
                        <table className={styles.tablaInterna}>
                          <thead>
                            <tr><th>Fecha</th><th>Medio</th><th>Obs.</th><th className={styles.thRight}>Monto</th></tr>
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

      {/* ══ MODAL: NUEVO / EDITAR CLIENTE ══ */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button className={styles.modalCerrar} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>

              <div className={styles.formGrupo}>
                <label>Nombre / Razón social *</label>
                <input type="text" className={styles.input}
                  placeholder="Ej: Constructora Sur S.R.L."
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>

              <div className={styles.formGrupo}>
                <label>CUIT</label>
                <input type="text" className={styles.input}
                  placeholder="20-12345678-9"
                  value={form.cuit}
                  onChange={e => setForm({ ...form, cuit: e.target.value })} />
              </div>

              <div className={styles.formGrupo}>
                <label>Dirección</label>
                <input type="text" className={styles.input}
                  placeholder="Av. San Martín 1234, Posadas"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGrupo}>
                  <label>Teléfono</label>
                  <input type="text" className={styles.input}
                    placeholder="376 4123456"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className={styles.formGrupo}>
                  <label>Email</label>
                  <input type="email" className={styles.input}
                    placeholder="cliente@empresa.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>

              <div className={styles.formGrupo}>
                <label>Tipo de factura por defecto</label>
                <div className={styles.tipoWrap}>
                  {['A', 'B'].map(t => (
                    <button key={t}
                      className={`${styles.tipoBtn} ${form.tipo_factura === t ? styles.tipoBtnActivo : ''}`}
                      onClick={() => setForm({ ...form, tipo_factura: t })}>
                      Factura {t}
                    </button>
                  ))}
                </div>
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

              {errorForm && <div className={styles.errorMsg}>⚠ {errorForm}</div>}

              <div className={styles.modalAcciones}>
                <button className={styles.btnCancelar} onClick={() => setModal(false)}>Cancelar</button>
                <button className={styles.btnConfirmar} onClick={guardarCliente} disabled={guardando}>
                  {guardando ? 'Guardando...' : editando ? '✓ Guardar cambios' : '✓ Crear cliente'}
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
              <h3>Registrar pago</h3>
              <button className={styles.modalCerrar} onClick={() => setModalPago(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalCliente}>
                <span className={styles.modalClienteLabel}>Cliente</span>
                <strong style={{ color: '#00C8F0' }}>{clienteCC?.nombre}</strong>
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
