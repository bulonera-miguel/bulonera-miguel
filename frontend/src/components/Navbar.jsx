import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './Navbar.module.css'

const logoSvg = '/logo-bm-blueprint.svg'

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()
  // useLocation: nos dice en qué ruta estamos actualmente.
  // Lo usamos para marcar el link activo dinámicamente.
  // Así cuando estemos en /inventario, ese link se resalta automáticamente.

  const esActivo = (ruta) => location.pathname === ruta ? styles.active : ''
  // esActivo: función que compara la ruta actual con la del link.
  // Si coinciden devuelve la clase 'active', si no devuelve string vacío.

  return (
    <nav className={styles.nav}>
      {/* Logo */}
      <div className={styles.logo}>
        <Link to="/">
          <img className={styles.logoImg} src={logoSvg} alt="Bulonera Miguel" />
        </Link>
      </div>

      {/* Links desktop */}
      <ul className={styles.navLinksDesktop}>
        <li><Link to="/"           className={esActivo('/')}>Inicio</Link></li>
        <li><Link to="/inventario" className={esActivo('/inventario')}>Inventario</Link></li>
        <li><Link to="/stock"      className={esActivo('/stock')}>Stock</Link></li>
        <li><Link to="/reportes"   className={esActivo('/reportes')}>Reportes</Link></li>
      </ul>

      {/* Portal — menú mobile + overlay */}
      {createPortal(
        <>
          <ul className={`${styles.navLinks} ${menuAbierto ? styles.navLinksOpen : ''}`}>
            <li><Link to="/"           className={esActivo('/')}           onClick={() => setMenuAbierto(false)}>Inicio</Link></li>
            <li><Link to="/inventario" className={esActivo('/inventario')} onClick={() => setMenuAbierto(false)}>Inventario</Link></li>
            <li><Link to="/stock"      className={esActivo('/stock')}      onClick={() => setMenuAbierto(false)}>Stock</Link></li>
            <li><Link to="/reportes"   className={esActivo('/reportes')}   onClick={() => setMenuAbierto(false)}>Reportes</Link></li>
          </ul>
          {menuAbierto && (
            <div className={styles.menuOverlay} onClick={() => setMenuAbierto(false)} />
          )}
        </>,
        document.body
      )}

      {/* Derecha del nav */}
      <div className={styles.navRight}>
        <div className={styles.statusPill}>
          <div className={styles.dotLive}></div>
          Sistema activo
        </div>
        <Link to="/login">
          <button className={styles.btnNav}><span>Iniciar sesión</span></button>
        </Link>

        {/* Botón hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Menú de navegación"
        >
          <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.hamburgerLineTop : ''}`}></span>
          <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.hamburgerLineMid : ''}`}></span>
          <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.hamburgerLineBot : ''}`}></span>
        </button>
      </div>
    </nav>
  )
}