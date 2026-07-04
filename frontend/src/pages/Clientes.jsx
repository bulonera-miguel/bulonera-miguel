import { useState, useEffect, useCallback } from 'react'
import styles from './Clientes.module.css'
import CuentaCorriente from '../components/CuentaCorriente'
import DetalleCC from '../components/DetalleCC'
import HistorialVentasCliente from '../components/HistorialVentasCliente'
import Navbar from '../components/Navbar'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Clientes() {
  const [tab, setTab] = useState('clientes')
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [modalCliente, setModalCliente] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)
  const [form, setForm] = useState({
    nombre: '', cuit: '', direccion: '', telefono: '',
    email: '', tipo_factura: 'B', tiene_cuenta_corriente: false
  })
  const [clienteCC, setClienteCC] = useState(null)
  const [clienteHist, setClienteHist] = useState(null)
  const [modalPago, setModalPago] = useState(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split('T')[0])
  const [pagoMedio, setPagoMedio] = useState('efectivo')
  const [pagoObs, setPagoObs] = useState('')
  const [pagoError, setPagoError] = useState(null)
  const [pagoGuardando, setPagoGuardando] = useState(false)
  const [modalConfirmar, setModalConfirmar] = useState(null)

  const cargarClientes = useCallback(async () => {
    try {
      setCargando(true)
      const res = await fetch(`${BASE_URL}/api/clientes/`)
      const data = await res.json()
      setClientes(data)
    } catch (e) {
      setError('Error al cargar clientes')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarClientes() }, [cargarClientes])

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', cuit: '', direccion: '', telefono: '', email: '', tipo_factura: 'B', tiene_cuenta_corriente: false })
    setFormError(null)
    setModalCliente(true)
  }

  const abrirEditar = (c) => {
    setEditando(c)
    setForm({
      nombre: c.nombre || '', cuit: c.cuit || '', direccion: c.direccion || '',
      telefono: c.telefono || '', email: c.email || '',
      tipo_factura: c.tipo_factura || 'B',
      tiene_cuenta_corriente: c.tiene_cuenta_corriente || false
    })
    setFormError(null)
    setModalCliente(true)
  }

  const guardarCliente = async () => {
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio'); return }
    setGuardando(true)
    setFormError(null)
    try {
      const url = editando
        ? `${BASE_URL}/api/clientes/${editando.id}`
        : `${BASE_URL}/api/clientes/`
      const method = editando ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error') }
      await cargarClientes()
      setModalCliente(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminarCliente = (c) => {
    setModalConfirmar({
      mensaje: `¿Confirmás que querés eliminar a ${c.nombre}? Esta acción no se puede deshacer.`,
      onConfirmar: async () => {
        try {
          await fetch(`${BASE_URL}/api/clientes/${c.id}`, { method: 'DELETE' })
          await cargarClientes()
          setModalConfirmar(null)
        } catch (e) {
          alert('Error al eliminar cliente')
          setModalConfirmar(null)
        }
      }
    })
  }

  const seleccionarClienteCC = (c) => {
    setClienteCC(c)
    setTab('cc')
  }

  const seleccionarClienteHist = (c) => {
    setClienteHist(c)
    setTab('historial')
  }

  const registrarPago = async () => {
    if (!pagoMonto || parseFloat(pagoMonto) <= 0) { setPagoError('Ingresá un monto válido'); return }
    setPagoGuardando(true)
    setPagoError(null)
    try {
      const res = await fetch(`${BASE_URL}/api/cuenta-corriente/pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: modalPago.id, monto: parseFloat(pagoMonto),
          fecha: pagoFecha, medio_pago: pagoMedio, observaciones: pagoObs
        })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error') }
      setModalPago(null)
      setPagoMonto(''); setPagoObs('')
      await cargarClientes()
    } catch (e) {
      setPagoError(e.message)
    } finally {
      setPagoGuardando(false)
    }
  }

  const eliminarPago = (pagoId) => {
    setModalConfirmar({
      mensaje: '¿Confirmás que querés eliminar este pago? Esta acción no se puede deshacer.',
      onConfirmar: async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/cuenta-corriente/pagos/${pagoId}`, { method: 'DELETE' })
          if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Error al eliminar') }
          setModalConfirmar(null)
        } catch (e) {
          alert(`Error: ${e.message}`)
          setModalConfirmar(null)
        }
      }
    })
  }

  const fmtP = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.contenido}>
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Clientes</h2>
            <span className={styles.pageSubtitle}>Alta, edición y gestión de clientes</span>
          </div>
          <button className={styles.btnNuevo} onClick={abrirNuevo}>+ Nuevo Cliente</button>
        </div>

        <div className={styles.tabs}>
          {[
            { id: 'clientes', label: '≡ Clientes' },
            { id: 'cc',       label: '$ Cuenta Corriente' },
            { id: 'historial',label: '↑ Historial Ventas' },
          ].map(t => (
            <button key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActivo : ''}`}
              onClick={() => { setTab(t.id); setClienteCC(null); setClienteHist(null) }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.tabContenido}>

          {tab === 'clientes' && (
            <div>
              <input type="text" className={styles.buscador}
                placeholder="Buscar por nombre..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)} />

              {cargando ? (
                <div className={styles.estado}>Cargando clientes...</div>
              ) : error ? (
                <div className={styles.errorMsg}>{error}</div>
              ) : clientesFiltrados.length === 0 ? (
                <div className={styles.estado}>No hay clientes registrados</div>
              ) : (
                <>
                  <table className={styles.tabla}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>CUIT</th>
                        <th>Dirección</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Tipo Fact.</th>
                        <th>Cta. Cte.</th>
                        <th className={styles.tdAcciones}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map(c => (
                        <tr key={c.id} className={styles.tablaFila}>
                          <td className={styles.tdNombre}>{c.nombre}</td>
                          <td className={styles.tdSub}>{c.cuit || '—'}</td>
                          <td className={styles.tdSub}>{c.direccion || '—'}</td>
                          <td className={styles.tdSub}>{c.telefono || '—'}</td>
                          <td className={styles.tdSub}>{c.email || '—'}</td>
                          <td>
                            <span className={c.tipo_factura === 'A' ? styles.badgeFacturaA : styles.badgeFacturaB}>
                              Factura {c.tipo_factura || 'B'}
                            </span>
                          </td>
                          <td>
                            <label className={styles.switchLabel}>
                              <div className={styles.switchWrap}>
                                <input type="checkbox" className={styles.switchInput}
                                  checked={c.tiene_cuenta_corriente || false} readOnly />
                                <span className={styles.switchSlider}></span>
                              </div>
                            </label>
                          </td>
                          <td className={styles.tdAcciones}>
                            <button className={styles.btnEditar} onClick={() => abrirEditar(c)}>✎ Editar</button>
                            {c.tiene_cuenta_corriente && (
                              <button className={styles.btnVerCC} onClick={() => seleccionarClienteCC(c)}>$ Ver CC</button>
                            )}
                            <button className={styles.btnVerHist} onClick={() => seleccionarClienteHist(c)}>↑ Ventas</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className={styles.tarjetasClientes}>
                    {clientesFiltrados.map(c => (
                      <div key={c.id} className={styles.tarjetaCliente}>
                        <div className={styles.tarjetaClienteTop}>
                          <span className={styles.tarjetaClienteNombre}>{c.nombre}</span>
                          <span className={c.tipo_factura === 'A' ? styles.badgeFacturaA : styles.badgeFacturaB}>
                            Factura {c.tipo_factura || 'B'}
                          </span>
                        </div>
                        {c.cuit && <div className={styles.tarjetaClienteDato}><span>CUIT</span><strong>{c.cuit}</strong></div>}
                        {c.direccion && <div className={styles.tarjetaClienteDato}><span>Dirección</span><strong>{c.direccion}</strong></div>}
                        {c.telefono && <div className={styles.tarjetaClienteDato}><span>Teléfono</span><strong>{c.telefono}</strong></div>}
                        {c.email && <div className={styles.tarjetaClienteDato}><span>Email</span><strong>{c.email}</strong></div>}
                        <div className={styles.tarjetaClienteDato}>
                          <span>Cta. Cte.</span>
                          <strong>{c.tiene_cuenta_corriente ? '✓ Sí' : '—'}</strong>
                        </div>
                        <div className={styles.tarjetaClienteAcciones}>
                          <button className={styles.btnEditar} onClick={() => abrirEditar(c)}>✎ Editar</button>
                          {c.tiene_cuenta_corriente && (
                            <button className={styles.btnVerCC} onClick={() => seleccionarClienteCC(c)}>$ Ver CC</button>
                          )}
                          <button className={styles.btnVerHist} onClick={() => seleccionarClienteHist(c)}>↑ Ventas</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'cc' && (
            <div>
              {!clienteCC ? (
                <CuentaCorriente
                  clientes={clientes}
                  onSeleccionar={seleccionarClienteCC}
                  BASE_URL={BASE_URL}
                />
              ) : (
                <DetalleCC
                  cliente={clienteCC}
                  onVolver={() => setClienteCC(null)}
                  BASE_URL={BASE_URL}
                  onEliminarPago={eliminarPago}
                />
              )}
            </div>
          )}

          {tab === 'historial' && (
            <HistorialVentasCliente BASE_URL={BASE_URL} clientes={clientes} clienteInicial={clienteHist} />
          )}

        </div>
      </div>

      {/* ══ MODAL: CONFIRMAR ACCIÓN ══ */}
      {modalConfirmar && (
        <div className={styles.modalOverlay} onClick={() => setModalConfirmar(null)}>
          <div className={styles.modalConfirmarBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalConfirmarIcono}>⚠</div>
            <p className={styles.modalConfirmarTexto}>{modalConfirmar.mensaje}</p>
            <div className={styles.modalConfirmarAcciones}>
              <button className={styles.btnCancelar} onClick={() => setModalConfirmar(null)}>Cancelar</button>
              <button className={styles.btnEliminarConfirmar} onClick={modalConfirmar.onConfirmar}>✕ Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: REGISTRAR PAGO ══ */}
      {modalPago && (
        <div className={styles.modalOverlay} onClick={() => setModalPago(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Registrar Pago — {modalPago.nombre}</h3>
              <button className={styles.modalCerrar} onClick={() => setModalPago(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrupo}>
                <label>Monto *</label>
                <input type="number" className={styles.input} value={pagoMonto}
                  onChange={e => setPagoMonto(e.target.value)} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className={styles.formGrupo}>
                <label>Fecha *</label>
                <input type="date" className={styles.input} value={pagoFecha}
                  onChange={e => setPagoFecha(e.target.value)} />
              </div>
              <div className={styles.formGrupo}>
                <label>Medio de pago</label>
                <select className={styles.input} value={pagoMedio} onChange={e => setPagoMedio(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div className={styles.formGrupo}>
                <label>Observaciones</label>
                <input type="text" className={styles.input} value={pagoObs}
                  onChange={e => setPagoObs(e.target.value)} placeholder="Opcional..." />
              </div>
              {pagoError && <div className={styles.errorMsg}>{pagoError}</div>}
              <button className={styles.btnPrimario} onClick={registrarPago} disabled={pagoGuardando}>
                {pagoGuardando ? 'Guardando...' : '✓ Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: NUEVO / EDITAR CLIENTE ══ */}
      {modalCliente && (
        <div className={styles.modalOverlay} onClick={() => setModalCliente(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button className={styles.modalCerrar} onClick={() => setModalCliente(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrupo}>
                <label>Nombre *</label>
                <input type="text" className={styles.input} value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Nombre completo o razón social" />
              </div>
              <div className={styles.formGrupo}>
                <label>CUIT</label>
                <input type="text" className={styles.input} value={form.cuit}
                  onChange={e => setForm({...form, cuit: e.target.value})}
                  placeholder="XX-XXXXXXXX-X" />
              </div>
              <div className={styles.formGrupo}>
                <label>Dirección</label>
                <input type="text" className={styles.input} value={form.direccion}
                  onChange={e => setForm({...form, direccion: e.target.value})}
                  placeholder="Dirección completa" />
              </div>
              <div className={styles.formGrupo}>
                <label>Teléfono</label>
                <input type="text" className={styles.input} value={form.telefono}
                  onChange={e => setForm({...form, telefono: e.target.value})}
                  placeholder="Teléfono de contacto" />
              </div>
              <div className={styles.formGrupo}>
                <label>Email</label>
                <input type="text" className={styles.input} value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="email@ejemplo.com" />
              </div>
              <div className={styles.formGrupo}>
                <label>Tipo de Factura</label>
                <select className={styles.input} value={form.tipo_factura}
                  onChange={e => setForm({...form, tipo_factura: e.target.value})}>
                  <option value="B">Factura B — Consumidor Final / Monotributista</option>
                  <option value="A">Factura A — Responsable Inscripto con CUIT</option>
                </select>
              </div>
              <div className={styles.formGrupo}>
                <label className={styles.switchLabel}>
                  <span>Cuenta Corriente</span>
                  <div className={styles.switchWrap}>
                    <input type="checkbox" className={styles.switchInput}
                      checked={form.tiene_cuenta_corriente}
                      onChange={e => setForm({...form, tiene_cuenta_corriente: e.target.checked})} />
                    <span className={styles.switchSlider}></span>
                  </div>
                </label>
              </div>
              {formError && <div className={styles.errorMsg}>{formError}</div>}
              <button className={styles.btnPrimario} onClick={guardarCliente} disabled={guardando}>
                {guardando ? 'Guardando...' : editando ? '✓ Guardar Cambios' : '✓ Crear Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}