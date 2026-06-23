// ============================================================
// Usuarios.jsx — Panel de gestión de usuarios
// Solo accesible para usuarios con rol admin
// ============================================================

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import styles from './Usuarios.module.css'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Usuarios() {
  const { perfil } = useAuth()

  const [usuarios, setUsuarios]         = useState([])
  const [cargando, setCargando]         = useState(true)
  const [error, setError]               = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [usuarioEditar, setUsuarioEditar] = useState(null)
  const [mensaje, setMensaje]           = useState(null)

  const [form, setForm] = useState({
    nombre: '', email: '', password: '', rol: 'vendedor'
  })

  // ── CARGAR USUARIOS ──────────────────────────────────────
  useEffect(() => {
    cargarUsuarios()
  }, [])

  // ── TAMBIÉN REEMPLAZAR cargarUsuarios ──────────────────────────────────────── 
  const cargarUsuarios = async () => {
    try {
      setCargando(true)
      const res = await fetch(`${BASE_URL}/api/usuarios/`)
      if (!res.ok) throw new Error('Error al cargar usuarios')
      const data = await res.json()
      setUsuarios(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  // ── ABRIR MODAL ──────────────────────────────────────────
  const abrirModalCrear = () => {
    setUsuarioEditar(null)
    setForm({ nombre: '', email: '', password: '', rol: 'vendedor' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (u) => {
    setUsuarioEditar(u)
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol })
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setUsuarioEditar(null)
    setError(null)
  }

 // ── CREAR USUARIO ────────────────────────────────────────
  const crearUsuario = async () => {
    const res = await fetch(`${BASE_URL}/api/usuarios/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre:   form.nombre,
        email:    form.email,
        password: form.password,
        rol:      form.rol,
      })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Error al crear usuario')
    }
    return res.json()
  }


  // ── EDITAR USUARIO ───────────────────────────────────────
  const editarUsuario = async () => {
    const body = { nombre: form.nombre, rol: form.rol }
    if (form.password) body.password = form.password
 
    const res = await fetch(`${BASE_URL}/api/usuarios/${usuarioEditar.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Error al actualizar usuario')
    }
    return res.json()
  }

  // ── GUARDAR ──────────────────────────────────────────────
  const guardar = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      if (usuarioEditar) {
        await editarUsuario()
        mostrarMensaje('ok', 'Usuario actualizado correctamente')
      } else {
        await crearUsuario()
        mostrarMensaje('ok', 'Usuario creado correctamente')
      }
      cerrarModal()
      cargarUsuarios()
    } catch (e) {
      setError(e.message)
    }
  }

  // ── ACTIVAR / DESACTIVAR ─────────────────────────────────
  const toggleActivo = async (u) => {
    const accion = u.activo ? 'desactivar' : 'activar'
    if (!confirm(`¿Querés ${accion} a ${u.nombre}?`)) return
    try {
      await supabase
        .from('usuarios')
        .update({ activo: !u.activo })
        .eq('id', u.id)
      mostrarMensaje('ok', `Usuario ${u.activo ? 'desactivado' : 'activado'} correctamente`)
      cargarUsuarios()
    } catch (e) {
      mostrarMensaje('error', e.message)
    }
  }

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }

  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—'

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.contenido}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Usuarios</h2>
            <span className={styles.pageSubtitle}>Gestión de accesos al sistema</span>
          </div>
          <button className={styles.btnNuevo} onClick={abrirModalCrear}>
            + Nuevo usuario
          </button>
        </div>

        {/* MENSAJE */}
        {mensaje && (
          <div className={mensaje.tipo === 'ok' ? styles.mensajeOk : styles.mensajeError}>
            {mensaje.texto}
          </div>
        )}

        {/* TABLA */}
        <div className={styles.tableWrap}>
          {cargando ? (
            <div className={styles.estado}>Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className={styles.estado}>No hay usuarios registrados</div>
          ) : (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Alta</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className={!u.activo ? styles.filaInactiva : ''}>
                    <td data-label="Nombre">
                      <div className={styles.nombreWrap}>
                        <span className={styles.nombreAvatar}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </span>
                        {u.nombre}
                        {u.id === perfil?.id && (
                          <span className={styles.badgeYo}>Vos</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Rol">
                      <span className={u.rol === 'admin' ? styles.badgeAdmin : styles.badgeVendedor}>
                        {u.rol}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span className={u.activo ? styles.badgeActivo : styles.badgeInactivo}>
                        {u.activo ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td data-label="Alta">{fmtFecha(u.created_at)}</td>
                    <td data-label="Acciones" className={styles.tdAcciones}>
                      <button
                        className={styles.btnEditar}
                        onClick={() => abrirModalEditar(u)}
                      >
                        Editar
                      </button>
                      <button
                        className={u.activo ? styles.btnDesactivar : styles.btnActivar}
                        onClick={() => toggleActivo(u)}
                        disabled={u.id === perfil?.id}
                        // No puede desactivarse a sí mismo
                        title={u.id === perfil?.id ? 'No podés desactivarte a vos mismo' : ''}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* MODAL */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <h3>{usuarioEditar ? 'Editar usuario' : 'Nuevo usuario'}</h3>
              <button className={styles.modalCerrar} onClick={cerrarModal}>✕</button>
            </div>

            <form onSubmit={guardar} className={styles.form}>

              <div className={styles.formGroup}>
                <label>Nombre completo *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  className={styles.input}
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="juan@bulonera.com"
                  required
                  disabled={!!usuarioEditar}
                  // El email no se puede cambiar al editar
                />
                {usuarioEditar && (
                  <small className={styles.inputHint}>El email no se puede modificar</small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>{usuarioEditar ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                <input
                  type="password"
                  className={styles.input}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder={usuarioEditar ? 'Dejá vacío para no cambiar' : 'Mínimo 6 caracteres'}
                  required={!usuarioEditar}
                  minLength={6}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Rol *</label>
                <select
                  className={styles.input}
                  value={form.rol}
                  onChange={e => setForm({...form, rol: e.target.value})}
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {error && (
                <div className={styles.errorMsg}>⚠ {error}</div>
              )}

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnCancelar} onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnGuardar}>
                  {usuarioEditar ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
