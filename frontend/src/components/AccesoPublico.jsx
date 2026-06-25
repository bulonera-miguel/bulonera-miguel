// components/AccesoPublico.jsx
// Pantalla de acceso público al sistema Bulonera Miguel
// Completamente independiente del login interno del personal

import { useState } from 'react'
import { accesoLogin } from '../utils/auth'
import styles from './AccesoPublico.module.css'

export default function AccesoPublico({ onAutorizado }) {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const ok = accesoLogin(password)

    if (ok) {
      onAutorizado()
    } else {
      setError('Contraseña incorrecta')
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>

      {/* Fondos decorativos */}
      <div className={styles.gridBg}></div>
      <div className={styles.glow}></div>

      {/* Esquinas HUD */}
      <div className={`${styles.hud} ${styles.tl}`}></div>
      <div className={`${styles.hud} ${styles.tr}`}></div>
      <div className={`${styles.hud} ${styles.bl}`}></div>
      <div className={`${styles.hud} ${styles.br}`}></div>

      <div className={styles.card}>

        {/* Logo + título */}
        <div className={styles.header}>
          <img
            src="/logo-bm-blueprint.svg"
            alt="Bulonera Miguel"
            className={styles.logo}
          />
          <div className={styles.headerTexto}>
            <span className={styles.nombre}>Bulonera Miguel</span>
            <span className={styles.sub}>Sistema de Gestión</span>
          </div>
        </div>

        {/* Línea separadora */}
        <div className={styles.separator}></div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={styles.form}>

          <label className={styles.label}>Contraseña de acceso</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={styles.input}
            autoFocus
            disabled={loading}
          />

          {error && (
            <div className={styles.error}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.btn}
            disabled={loading || !password}
          >
            {loading ? 'Verificando...' : 'Ingresar al sistema'}
          </button>

        </form>

        <div className={styles.footer}>
          Acceso exclusivo — Bulonera Miguel S.R.L.
        </div>

      </div>
    </div>
  )
}
