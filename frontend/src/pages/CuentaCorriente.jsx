// ============================================================
// CuentaCorriente.jsx — Cuenta corriente de clientes
// Bulonera Miguel
// ============================================================

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import styles from './CuentaCorriente.module.css'

const BASE_URL = 'http://localhost:8000'

const UMBRALES = {
  normal:   20000,
  atencion: 50000,
}

export default function CuentaCorriente() {

  // ── ESTADOS LISTA ─────────────────────────────────────────
  const [clientes, setClientes]           = useState([])
  const [cargando, setCargando]           = useState(false)
  const [error, setError]                 = useState(null)

  // ── ESTADOS DETALLE ───────────────────────────────────────
  const [clienteActivo, setClienteActivo] = useState(null)
  const [detalle, setDetalle]             = useState(null)
  const [cargandoDet, setCargandoDet]     = useState(false)
  const [filtroDesde, setFiltroDesde]     = useState('')
  const [filtroHasta, setFiltroHasta]     = useState('')

  // ── MODAL PAGO ────────────────────────────────────────────
  const [modalPago, setModalPago]         = useState(false)
  const [pago, setPago]                   = useState({ monto: '', fecha: new Date().toISOString().split('T')[0], medio_pago: 'efectivo', observaciones: '' })
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [errorPago, setErrorPago]         = useState(null)
  const [pagoOk, setPagoOk]              = useState(null)

  // ── CARGAR LISTA ──────────────────────────────────────────
  const cargarClientes = async () => {
    try {
      setCargando(true)
      setError(null)
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente/`)
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      setClientes(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarClientes() }, [])

  // ── CARGAR DETALLE ────────────────────────────────────────
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
      const data = await res.json()
      setDetalle(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargandoDet(false)
    }
  }

  const seleccionarCliente = (cliente) => {
    setClienteActivo(cliente)
    setFiltroDesde('')
    setFiltroHasta('')
    setPagoOk(null)
    cargarDetalle(cliente)
  }

  const volver = () => {
    setClienteActivo(null)
    setDetalle(null)
    setFiltroDesde('')
    setFiltroHasta('')
    setPagoOk(null)
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
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente/${clienteActivo.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      // Recargar detalle y lista
      await cargarDetalle(clienteActivo, filtroDesde, filtroHasta)
      await cargarClientes()
      // Actualizar clienteActivo con nuevo saldo
      const updated = await fetch(`${BASE_URL}/api/cuenta-corriente/`)
      const lista = await updated.json()
      const nuevo = lista.find(c => c.id === clienteActivo.id)
      if (nuevo) setClienteActivo(nuevo)
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

  const badgeEstado = (estado) => {
    const map = {
      a_favor:  { label: '↑ A favor',   cls: styles.badgeAFavor  },
      normal:   { label: '✓ Normal',     cls: styles.badgeNormal  },
      atencion: { label: '⚠ Atención',  cls: styles.badgeAtencion },
      critico:  { label: '✕ Crítico',    cls: styles.badgeCritico  },
    }
    const b = map[estado] || map.normal
    return <span className={`${styles.badge} ${b.cls}`}>{b.label}</span>
  }

  // ── RENDER LISTA ──────────────────────────────────────────
  const renderLista = () => (
    <div>
      {error && <div className={styles.errorMsg}>⚠ {error}</div>}

      {cargando ? (
        <div className={styles.estado}>
          <div className={styles.spinner}></div>
          Cargando clientes...
        </div>
      ) : clientes.length === 0 ? (
        <div className={styles.estado}>
          No hay clientes con cuenta corriente habilitada.
          <div className={styles.estadoSub}>
            Para habilitar la cuenta corriente de un cliente, editalo desde la sección Clientes en Facturación.
          </div>
        </div>
      ) : (
        <>
          {/* KPIs resumen */}
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Clientes activos</span>
              <span className={styles.kpiValor} style={{ color: '#00C8F0' }}>{clientes.length}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Deuda total</span>
              <span className={styles.kpiValor} style={{ color: '#FFB800' }}>
                {fmtP(clientes.filter(c => c.saldo > 0).reduce((s, c) => s + c.saldo, 0))}
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>En crítico</span>
              <span className={styles.kpiValor} style={{ color: '#FF4444' }}>
                {clientes.filter(c => c.estado === 'critico').length}
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>A favor</span>
              <span className={styles.kpiValor} style={{ color: '#00E87A' }}>
                {clientes.filter(c => c.estado === 'a_favor').length}
              </span>
            </div>
          </div>

          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>CUIT</th>
                <th>Ventas</th>
                <th>Total facturado</th>
                <th>Total pagado</th>
                <th>Saldo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr
                  key={c.id}
                  className={styles.tablaFila}
                  onClick={() => seleccionarCliente(c)}
                  title="Clic para ver detalle"
                >
                  <td className={styles.tdNombre}>{c.nombre}</td>
                  <td className={styles.tdCuit}>{c.cuit || '—'}</td>
                  <td className={styles.tdCenter}>{c.cant_ventas}</td>
                  <td className={styles.tdRight}>{fmtP(c.total_ventas)}</td>
                  <td className={styles.tdRight} style={{ color: '#00E87A' }}>{fmtP(c.total_pagos)}</td>
                  <td className={styles.tdRight}>
                    <span className={c.saldo > 0 ? styles.saldoDeudor : styles.saldoAFavor}>
                      {c.saldo < 0 ? `+${fmtP(Math.abs(c.saldo))}` : fmtP(c.saldo)}
                    </span>
                  </td>
                  <td>{badgeEstado(c.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )

  // ── RENDER DETALLE ────────────────────────────────────────
  const renderDetalle = () => (
    <div>
      {/* Header detalle */}
      <div className={styles.detalleHeader}>
        <button className={styles.btnVolver} onClick={volver}>
          ← Volver
        </button>
        <div className={styles.detalleClienteInfo}>
          <span className={styles.detalleNombre}>{clienteActivo?.nombre}</span>
          {clienteActivo?.cuit && (
            <span className={styles.detalleCuit}>CUIT: {clienteActivo.cuit}</span>
          )}
        </div>
        <div className={styles.detalleSaldoWrap}>
          {detalle && (
            <>
              {badgeEstado(detalle.estado)}
              <span className={`${styles.detalleSaldo} ${detalle.saldo < 0 ? styles.saldoAFavor : detalle.saldo === 0 ? styles.saldoCero : styles.saldoDeudor}`}>
                {detalle.saldo < 0
                  ? `Saldo a favor: +${fmtP(Math.abs(detalle.saldo))}`
                  : detalle.saldo === 0
                  ? 'Sin deuda'
                  : `Debe: ${fmtP(detalle.saldo)}`}
              </span>
            </>
          )}
        </div>
        <button className={styles.btnPagar} onClick={() => { setModalPago(true); setErrorPago(null) }}>
          + Registrar pago
        </button>
      </div>

      {/* Alerta pago ok */}
      {pagoOk && (
        <div className={styles.pagoOkMsg}>
          ✓ Pago de {fmtP(pagoOk.monto)} registrado correctamente el {fmtF(pagoOk.fecha)}
        </div>
      )}

      {/* Filtros detalle */}
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
          onClick={() => cargarDetalle(clienteActivo, filtroDesde, filtroHasta)}>
          ▶ Filtrar
        </button>
        <button className={styles.btnLimpiarFiltro}
          onClick={() => { setFiltroDesde(''); setFiltroHasta(''); cargarDetalle(clienteActivo) }}>
          ✕ Limpiar
        </button>
      </div>

      {cargandoDet ? (
        <div className={styles.estado}>
          <div className={styles.spinner}></div>
          Cargando movimientos...
        </div>
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
                  <tr>
                    <th>Comprobante</th>
                    <th>Fecha</th>
                    <th>Total</th>
                  </tr>
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
                  <tr>
                    <th>Fecha</th>
                    <th>Medio</th>
                    <th>Observaciones</th>
                    <th>Monto</th>
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
  )

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.contenido}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Cuenta Corriente</h2>
            <span className={styles.pageSubtitle}>
              {clienteActivo ? `Detalle — ${clienteActivo.nombre}` : 'Gestión de deudas y pagos de clientes'}
            </span>
          </div>
          {!clienteActivo && (
            <div className={styles.leyenda}>
              <span className={`${styles.badge} ${styles.badgeNormal}`}>✓ Normal &lt; $20.000</span>
              <span className={`${styles.badge} ${styles.badgeAtencion}`}>⚠ Atención &lt; $50.000</span>
              <span className={`${styles.badge} ${styles.badgeCritico}`}>✕ Crítico ≥ $50.000</span>
            </div>
          )}
        </div>

        {clienteActivo ? renderDetalle() : renderLista()}

      </div>

      {/* ── MODAL REGISTRAR PAGO ── */}
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
                <strong>{clienteActivo?.nombre}</strong>
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
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Ej: 15000"
                  value={pago.monto}
                  onChange={e => setPago({ ...pago, monto: e.target.value })}
                  min="0" step="0.01" autoFocus
                />
              </div>

              <div className={styles.formGrupo}>
                <label>Fecha</label>
                <input
                  type="date"
                  className={styles.input}
                  value={pago.fecha}
                  onChange={e => setPago({ ...pago, fecha: e.target.value })}
                />
              </div>

              <div className={styles.formGrupo}>
                <label>Medio de pago</label>
                <select
                  className={styles.input}
                  value={pago.medio_pago}
                  onChange={e => setPago({ ...pago, medio_pago: e.target.value })}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className={styles.formGrupo}>
                <label>Observaciones (opcional)</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Notas sobre el pago..."
                  value={pago.observaciones}
                  onChange={e => setPago({ ...pago, observaciones: e.target.value })}
                  rows={2}
                />
              </div>

              {errorPago && <div className={styles.errorMsg}>⚠ {errorPago}</div>}

              <div className={styles.modalAcciones}>
                <button className={styles.btnCancelar} onClick={() => setModalPago(false)}>
                  Cancelar
                </button>
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
