// ============================================================
// Login.jsx — Página de inicio de sesión
// ============================================================

import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Login.module.css'

export default function Login() {
  const { login, usuario, cargando } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  // Si ya está logueado, redirigimos al inicio
  if (!cargando && usuario) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (e) {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>

      {/* Fondos decorativos */}
      <div className={styles.gridBg}></div>
      <div className={styles.glow}></div>

      {/* Esquinas HUD */}
      <div className={`${styles.hud} ${styles.tl}`}></div>
      <div className={`${styles.hud} ${styles.tr}`}></div>
      <div className={`${styles.hud} ${styles.bl}`}></div>
      <div className={`${styles.hud} ${styles.br}`}></div>

      <div className={styles.loginWrap}>

        {/* Logo + título */}
        <div className={styles.logoWrap}>
          <img src="/logo-bm-blueprint.svg" alt="Bulonera Miguel" className={styles.logo} />
          <div className={styles.logoTexto}>
            <span className={styles.logoNombre}>Bulonera Miguel</span>
            <span className={styles.logoSub}>Sistema de Gestión</span>
          </div>
        </div>

        {/* Panel de login */}
        <div className={styles.panel}>

          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Iniciar sesión</h2>
            <span className={styles.panelSub}>Ingresá tus credenciales para continuar</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="tu@email.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Contraseña</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className={styles.errorMsg}>
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.btnLogin}
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>

          </form>

        </div>

        <div className={styles.footer}>
          Sistema de gestión interno — acceso restringido
        </div>

      </div>
    </div>
  )
}
