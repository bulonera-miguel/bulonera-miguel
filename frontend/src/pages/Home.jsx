import { Link } from 'react-router-dom'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './Home.module.css'

const logoSvg = '/logo-bm-blueprint.svg'

const PRODUCTO_CRITICO = {
  nombre:         'Bulón hex. M10',
  nombreCompleto: 'Bulón hexagonal M10 × 50mm zinc',
  codigo:         'BM-1050-ZN',
  categoria:      'Bulones zinc',
  stock:          18,
  minimo:         50,
  estado:         'CRÍTICO',
}
const KPIS = {
  totalProductos:  '2.847',
  movimientosHoy:  142,
  alertasCriticas: 3,
}

export default function Home() {
  const [producto] = useState(PRODUCTO_CRITICO)
  const [kpis]     = useState(KPIS)
  const [menuAbierto, setMenuAbierto] = useState(false)
  // menuAbierto: controla si el menú hamburger está abierto o cerrado.
  // false = cerrado (estado inicial), true = abierto.
  // Se usa solo en mobile — en desktop este estado no tiene efecto visual.

  return (
    <>
      {/* Fondos decorativos */}
      <div className={styles.gridBg}></div>
      <div className={styles.centerGlow}></div>
      <div className={styles.scan}></div>

      {/* Esquinas HUD */}
      <div className={`${styles.hud} ${styles.tl}`}></div>
      <div className={`${styles.hud} ${styles.tr}`}></div>
      <div className={`${styles.hud} ${styles.bl}`}></div>
      <div className={`${styles.hud} ${styles.br}`}></div>

      <div className={styles.page}>

        {/* ── NAV ── */}
        <nav className={`${styles.fi} ${styles.d1}`}>
          <div className={styles.logo}>
            <img className={styles.logoImg} src={logoSvg} alt="Bulonera Miguel" />
          </div>

          {/* Nav links — solo visible en desktop */}
          <ul className={styles.navLinksDesktop}>
            <li><Link to="/" className={styles.active}>Inicio</Link></li>
            <li><Link to="/inventario">Inventario</Link></li>
            <li><Link to="/stock">Stock</Link></li>
            <li><Link to="/reportes">Reportes</Link></li>
          </ul>

          {/* Menú y overlay via Portal — se renderizan en el body,
            fuera del árbol de React, sin problemas de z-index */}
          {createPortal(
            <>
              <ul className={`${styles.navLinks} ${menuAbierto ? styles.navLinksOpen : ''}`}>
                <li><Link to="/" className={styles.active} onClick={() => setMenuAbierto(false)}>Inicio</Link></li>
                <li><Link to="/inventario" onClick={() => setMenuAbierto(false)}>Inventario</Link></li>
                <li><Link to="/stock" onClick={() => setMenuAbierto(false)}>Stock</Link></li>
                <li><Link to="/reportes" onClick={() => setMenuAbierto(false)}>Reportes</Link></li>
              </ul>
              {menuAbierto && (
                <div className={styles.menuOverlay} onClick={() => setMenuAbierto(false)} />
              )}
            </>,
            document.body
          )}

          <div className={styles.navRight}>
            <div className={styles.statusPill}>
              <div className={styles.dotLive}></div>
              Sistema activo
            </div>
            <Link to="/login">
              <button className={styles.btnNav}><span>Iniciar sesión</span></button>
            </Link>

            {/* Botón hamburger — solo visible en mobile */}
            <button
              className={styles.hamburger}
              onClick={() => setMenuAbierto(!menuAbierto)}
              // !menuAbierto: invierte el estado actual.
              // Si estaba cerrado (false) → lo abre (true).
              // Si estaba abierto (true) → lo cierra (false).
              aria-label="Menú de navegación"
              // aria-label: accesibilidad — describe el botón para lectores de pantalla.
            >
              {/* Las 3 líneas del hamburger — se animan cuando el menú está abierto */}
              <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.hamburgerLineTop : ''}`}></span>
              <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.hamburgerLineMid : ''}`}></span>
              <span className={`${styles.hamburgerLine} ${menuAbierto ? styles.hamburgerLineBot : ''}`}></span>
              {/* Cuando menuAbierto es true, las 3 líneas se transforman en una X
                  usando rotaciones CSS — línea top rota +45°, mid desaparece,
                  bot rota -45°. */}
            </button>
          </div>
        </nav>

        {/* Overlay oscuro detrás del menú mobile — cierra el menú al hacer clic */}
        {menuAbierto && (
          <div
            className={styles.menuOverlay}
            onClick={() => setMenuAbierto(false)}
            // Si el usuario hace clic fuera del menú, lo cierra.
          />
        )}

        {/* ── HERO ── */}
        <section className={styles.hero}>

          {/* COLUMNA IZQUIERDA — KPIs */}
          <div className={`${styles.heroLeft} ${styles.fi} ${styles.d2}`}>
            <div className={styles.statCard}>
              <div className={styles.statCardLabel}>Productos registrados</div>
              <div className={styles.statCardNum}>{kpis.totalProductos}</div>
              <div className={styles.statCardSub}>unidades en catálogo activo</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardLabel}>Movimientos hoy</div>
              <div className={styles.statCardNum}>{kpis.movimientosHoy}</div>
              <div className={styles.statCardSub}>entradas + salidas de stock</div>
            </div>
            <div className={styles.sysGrid}>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Conexión</span>
                <span className={`${styles.sysCellVal} ${styles.green}`}>Activa</span>
              </div>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Servidor</span>
                <span className={`${styles.sysCellVal} ${styles.cyan}`}>Cloud</span>
              </div>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Alertas críticas</span>
                <span className={`${styles.sysCellVal} ${styles.red}`}>{kpis.alertasCriticas} ítems</span>
              </div>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Disponibilidad</span>
                <span className={`${styles.sysCellVal} ${styles.green}`}>99.9%</span>
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL — Bulón blueprint — se oculta en tablet y mobile */}
          <div className={`${styles.heroCenter} ${styles.fi} ${styles.d3}`}>
            <div className={styles.ring1}></div>
            <div className={styles.ring2}></div>
            <div className={styles.boltWrap}>
              <div className={`${styles.co} ${styles.L1}`}>
                <span className={styles.coVal}>{producto.nombre}</span>
                <div className={styles.coInner}><div className={styles.coLine}></div><span>Producto</span></div>
              </div>
              <div className={`${styles.co} ${styles.L2}`}>
                <span className={styles.coVal}>{producto.codigo}</span>
                <div className={styles.coInner}><div className={styles.coLine}></div><span>Código</span></div>
              </div>
              <div className={`${styles.co} ${styles.L3}`}>
                <span className={styles.coVal}>{producto.categoria}</span>
                <div className={styles.coInner}><div className={styles.coLine}></div><span>Categoría</span></div>
              </div>
              <div className={`${styles.co} ${styles.R1}`}>
                <div className={styles.coInner}><span>Stock actual</span><div className={styles.coLine}></div></div>
                <span className={`${styles.coVal} ${styles.critico}`}>{producto.stock} uds.</span>
              </div>
              <div className={`${styles.co} ${styles.R2}`}>
                <div className={styles.coInner}><span>Mínimo</span><div className={styles.coLine}></div></div>
                <span className={`${styles.coVal} ${styles.alerta}`}>{producto.minimo} uds.</span>
              </div>
              <div className={`${styles.co} ${styles.R3}`}>
                <div className={styles.coInner}><span>Estado</span><div className={styles.coLine}></div></div>
                <span className={`${styles.coVal} ${styles.critico}`}>{producto.estado}</span>
              </div>
              <svg viewBox="0 0 240 395" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="120" y1="14" x2="120" y2="340" stroke="rgba(0,200,240,0.08)" strokeWidth="0.8" strokeDasharray="10,5"/>
                <polygon className={styles.draw} points="120,50 163,75 163,125 120,150 77,125 77,75" stroke="#00C8F0" strokeWidth="1.6" fill="rgba(0,200,240,0.04)"/>
                <polygon className={styles.draw2} points="120,60 155,81 155,119 120,140 85,119 85,81" stroke="rgba(0,200,240,0.18)" strokeWidth="0.8" fill="none"/>
                <circle cx="120" cy="100" r="13" stroke="rgba(0,200,240,0.28)" strokeWidth="0.8" fill="rgba(0,200,240,0.03)" className={styles.draw3}/>
                <line x1="120" y1="87" x2="120" y2="113" stroke="rgba(0,200,240,0.2)" strokeWidth="0.7"/>
                <line x1="107" y1="100" x2="133" y2="100" stroke="rgba(0,200,240,0.2)" strokeWidth="0.7"/>
                <rect x="109" y="150" width="22" height="9" stroke="#00C8F0" strokeWidth="1.4" fill="rgba(0,200,240,0.04)" className={styles.draw2}/>
                <rect x="112" y="159" width="16" height="102" stroke="#00C8F0" strokeWidth="1.4" fill="rgba(0,200,240,0.04)" className={styles.draw}/>
                <g stroke="rgba(0,200,240,0.30)" strokeWidth="0.8">
                  <line x1="112" y1="167" x2="128" y2="163"/><line x1="112" y1="174" x2="128" y2="170"/>
                  <line x1="112" y1="181" x2="128" y2="177"/><line x1="112" y1="188" x2="128" y2="184"/>
                  <line x1="112" y1="195" x2="128" y2="191"/><line x1="112" y1="202" x2="128" y2="198"/>
                  <line x1="112" y1="209" x2="128" y2="205"/><line x1="112" y1="216" x2="128" y2="212"/>
                  <line x1="112" y1="223" x2="128" y2="219"/><line x1="112" y1="230" x2="128" y2="226"/>
                  <line x1="112" y1="237" x2="128" y2="233"/><line x1="112" y1="244" x2="128" y2="240"/>
                  <line x1="112" y1="251" x2="128" y2="247"/><line x1="112" y1="258" x2="128" y2="254"/>
                </g>
                <ellipse cx="120" cy="266" rx="22" ry="4" stroke="#00C8F0" strokeWidth="1.3" fill="rgba(0,200,240,0.05)" className={styles.draw3}/>
                <ellipse cx="120" cy="266" rx="9" ry="2" stroke="rgba(0,200,240,0.25)" strokeWidth="0.7" fill="none"/>
                <polygon className={styles.draw2} points="120,271 142,284 142,309 120,322 98,309 98,284" stroke="#00C8F0" strokeWidth="1.6" fill="rgba(0,200,240,0.05)"/>
                <polygon className={styles.draw4} points="120,279 136,289 136,304 120,314 104,304 104,289" stroke="rgba(0,200,240,0.20)" strokeWidth="0.8" fill="none"/>
                <circle cx="120" cy="75"  r="3" fill="#00C8F0" opacity="0.8"/>
                <circle cx="112" cy="237" r="2.6" fill="#FF4444" opacity="0.9"/>
                <circle cx="140" cy="266" r="2.6" fill="#FF4444" opacity="0.9"/>
                <circle cx="98"  cy="297" r="2.6" fill="#FF4444" opacity="0.9"/>
              </svg>
              <div className={styles.productoPanel}>
                <div className={styles.productoPanelTag}>⚠ Producto con stock crítico</div>
                <div className={styles.productoPanelNombre}>{producto.nombreCompleto}</div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA — Título + CTA */}
          <div className={`${styles.heroRight} ${styles.fi} ${styles.d4}`}>
            <div className={styles.eyebrow}>Control de inventario</div>
            <h1 className={styles.heroTitle}>
              Precisión
              <span className={styles.tCyan}>Total</span>
              <span className={styles.tDim}>En cada pieza</span>
            </h1>
            <p className={styles.heroDesc}>
              Sistema integral de gestión de stock e inventario para Bulonera Miguel.
              Trazabilidad completa, alertas automáticas y reportes en tiempo real.
            </p>
            <div className={`${styles.ctaRow} ${styles.fi} ${styles.d5}`}>
              <button className={styles.btnCta}>Conocer el sistema</button>
              <button className={styles.btnDemo}>Ver demo</button>
            </div>
            <div className={`${styles.chips} ${styles.fi} ${styles.d6}`}>
              <div className={styles.chip}><strong>+200</strong> Categorías</div>
              <div className={styles.chip}><strong>24/7</strong> Online</div>
              <div className={styles.chip}><strong>100%</strong> Trazable</div>
            </div>
          </div>

        </section>
      </div>
    </>
  )
}