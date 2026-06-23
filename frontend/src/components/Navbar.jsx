import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Navbar.module.css'

const logoSvg = '/logo-bm-blueprint.svg'

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const { usuario, perfil, esAdmin, logout } = useAuth()

  const esActivo = (ruta) => location.pathname === ruta ? styles.active : ''

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

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
        <li><Link to="/compras" className={esActivo('/compras')}>Compras</Link></li>
        <li><Link to="/ventas"     className={esActivo('/ventas')}>Ventas</Link></li>        
        <li><Link to="/facturacion" className={esActivo('/facturacion')}>Facturación</Link></li>
        <li><Link to="/reportes"   className={esActivo('/reportes')}>Reportes</Link></li> 
        <li><Link to="/clientes"   className={esActivo('/clientes')}>Clientes</Link></li>
        <li><Link to="/proveedores" className={esActivo('/proveedores')}>Proveedores</Link></li>        
        {/* Usuarios solo visible para admin */}
        {esAdmin && (
          <li>
            {/* <Link to="/usuarios" className={esActivo('/usuarios')}>Usuarios</Link> */}
            <a className={styles.linkDeshabilitado}>Usuarios</a>
          </li>
        )}
      </ul>

      {/* Portal — menú mobile + overlay */}
      {createPortal(
        <>
          <ul className={`${styles.navLinks} ${menuAbierto ? styles.navLinksOpen : ''}`}>
            <li><Link to="/"           className={esActivo('/')}           onClick={() => setMenuAbierto(false)}>Inicio</Link></li>
            <li><Link to="/inventario" className={esActivo('/inventario')} onClick={() => setMenuAbierto(false)}>Inventario</Link></li>
            <li><Link to="/compras" className={esActivo('/compras')}>Compras</Link></li>
            <li><Link to="/ventas"     className={esActivo('/ventas')}     onClick={() => setMenuAbierto(false)}>Ventas</Link></li>                     
            <li><Link to="/facturacion" className={esActivo('/facturacion')}>Facturación</Link></li>
            <li><Link to="/reportes"   className={esActivo('/reportes')}   onClick={() => setMenuAbierto(false)}>Reportes</Link></li>   
            <li><Link to="/clientes"   className={esActivo('/clientes')}   onClick={() => setMenuAbierto(false)}>Clientes</Link></li>         
            <li><Link to="/proveedores" className={esActivo('/proveedores')} onClick={() => setMenuAbierto(false)}>Proveedores</Link></li>
            
            {esAdmin && (
            <li> 
              {/* <Link to="/usuarios" className={esActivo('/usuarios')}   onClick={() => setMenuAbierto(false)}>Usuarios</Link> */}
              <a className={styles.linkDeshabilitado}>Usuarios</a>
            </li>  
            )}
            {/* Cerrar sesión en mobile */}
            {usuario && (
              <li>
                {/* <button className={styles.btnLogoutMobile} onClick={() => { handleLogout(); setMenuAbierto(false) }}> */}
                <button className={styles.btnLogoutMobileDeshabilitado} disabled>
                  Cerrar sesión
                </button>
              </li>
            )}
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

        {usuario ? (
          /* Usuario logueado — muestra nombre + botón cerrar sesión */
          <div className={styles.usuarioWrap}>
            <div className={styles.usuarioInfo}>
              <span className={styles.usuarioNombre}>
                {perfil?.nombre || usuario.email}
              </span>
              <span className={styles.usuarioRol}>
                {perfil?.rol || ''}
              </span>
            </div>
            {/* <button className={styles.btnLogout} onClick={handleLogout}> */}
            <button className={styles.btnLogoutDeshabilitado} disabled>
              Salir
            </button>
          </div>
        ) : (
          /* No logueado — muestra botón iniciar sesión */
          <Link to="/login">
            <button className={styles.btnNav}><span>Iniciar sesión</span></button>
          </Link>
        )}

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
