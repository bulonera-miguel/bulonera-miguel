import { useState, useEffect } from 'react'
import { portadaApi } from '../services/api'
import Navbar from '../components/Navbar'
import styles from './Home.module.css'

// ── Opciones del selector de vista ────────────────────────────
const OPCIONES_VISTA = [
  { value: 'stock_critico',  label: '⚠ Stock crítico',  },
  { value: 'mas_vendido',    label: '📈 Más vendido',    },
  { value: 'menos_vendido',  label: '📉 Menos vendido',  },
  { value: 'mas_reciente',   label: '🆕 Más reciente',   },
  { value: 'mayor_precio',   label: '💰 Mayor precio',   },
  { value: 'mayor_stock',    label: '📦 Mayor stock',    },
]

export default function Home() {
  // ── ESTADOS ──────────────────────────────────────────────
  const [kpis, setKpis]               = useState({ total_productos: '—', alertas_criticas: '—' })
  const [vistas, setVistas]           = useState({})
  const [vistaActual, setVistaActual] = useState('stock_critico')
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState(null)

  // ── CARGAR DATOS AL MONTAR ────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true)
        const data = await portadaApi.resumen()
        setKpis(data.kpis)
        setVistas(data.vistas)
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  // ── PRODUCTO ACTUALMENTE SELECCIONADO ─────────────────────
  const producto = vistas[vistaActual] || null
  // Si la vista seleccionada no tiene datos, producto es null

  // ── DATOS DEL PRODUCTO PARA EL SVG ───────────────────────
  const nombreProducto    = producto?.nombre?.split(' ').slice(0,3).join(' ') || '—'
  const codigoProducto    = producto?.codigo || '—'
  const categoriaProducto = '—'
  const stockProducto     = producto?.stock_actual ?? '—'
  const minimoProducto    = producto?.stock_minimo ?? '—'
  const estadoProducto    = producto
    ? (producto.stock_actual <= producto.stock_minimo ? 'CRÍTICO' : 'NORMAL')
    : '—'
  const esCritico = producto
    ? producto.stock_actual <= producto.stock_minimo
    : false

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
        <Navbar />

        {/* ── HERO ── */}
        <section className={styles.hero}>

          {/* COLUMNA IZQUIERDA — KPIs */}
          <div className={`${styles.heroLeft} ${styles.fi} ${styles.d2}`}>
            <div className={styles.statCard}>
              <div className={styles.statCardLabel}>Productos registrados</div>
              <div className={styles.statCardNum}>
                {cargando ? '...' : kpis.total_productos}
              </div>
              <div className={styles.statCardSub}>unidades en catálogo activo</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardLabel}>Alertas críticas</div>
              <div className={styles.statCardNum}>
                {cargando ? '...' : kpis.alertas_criticas}
              </div>
              <div className={styles.statCardSub}>productos bajo stock mínimo</div>
            </div>
            <div className={styles.sysGrid}>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Conexión</span>
                <span className={`${styles.sysCellVal} ${styles.green}`}>
                  {error ? 'Error' : cargando ? '...' : 'Activa'}
                </span>
              </div>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Servidor</span>
                <span className={`${styles.sysCellVal} ${styles.cyan}`}>Cloud</span>
              </div>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Alertas críticas</span>
                <span className={`${styles.sysCellVal} ${styles.red}`}>
                  {cargando ? '...' : `${kpis.alertas_criticas} ítems`}
                </span>
              </div>
              <div className={styles.sysCell}>
                <span className={styles.sysCellLabel}>Disponibilidad</span>
                <span className={`${styles.sysCellVal} ${styles.green}`}>99.9%</span>
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL — Bulón blueprint */}
          <div className={`${styles.heroCenter} ${styles.fi} ${styles.d3}`}>
            <div className={styles.ring1}></div>
            <div className={styles.ring2}></div>
            <div className={styles.boltWrap}>

              {/* Anotaciones izquierda */}
              <div className={`${styles.co} ${styles.L1}`}>
                <span className={styles.coVal}>{nombreProducto}</span>
                <div className={styles.coInner}><div className={styles.coLine}></div><span>Producto</span></div>
              </div>
              <div className={`${styles.co} ${styles.L2}`}>
                <span className={styles.coVal}>{codigoProducto}</span>
                <div className={styles.coInner}><div className={styles.coLine}></div><span>Código</span></div>
              </div>
              <div className={`${styles.co} ${styles.L3}`}>
                <span className={styles.coVal}>{categoriaProducto}</span>
                <div className={styles.coInner}><div className={styles.coLine}></div><span>Categoría</span></div>
              </div>

              {/* Anotaciones derecha */}
              <div className={`${styles.co} ${styles.R1}`}>
                <div className={styles.coInner}><span>Stock actual</span><div className={styles.coLine}></div></div>
                <span className={`${styles.coVal} ${esCritico ? styles.critico : ''}`}>
                  {stockProducto} {producto ? 'uds.' : ''}
                </span>
              </div>
              <div className={`${styles.co} ${styles.R2}`}>
                <div className={styles.coInner}><span>Mínimo</span><div className={styles.coLine}></div></div>
                <span className={`${styles.coVal} ${styles.alerta}`}>
                  {minimoProducto} {producto ? 'uds.' : ''}
                </span>
              </div>
              <div className={`${styles.co} ${styles.R3}`}>
                <div className={styles.coInner}><span>Estado</span><div className={styles.coLine}></div></div>
                <span className={`${styles.coVal} ${esCritico ? styles.critico : ''}`}>
                  {estadoProducto}
                </span>
              </div>

              {/* SVG Blueprint del bulón */}
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

              {/* Panel inferior — selector de vista */}
              <div className={styles.productoPanel}>
                {/* Selector de vista */}
                <select
                  className={styles.vistaSelect}
                  value={vistaActual}
                  onChange={e => setVistaActual(e.target.value)}
                >
                  {OPCIONES_VISTA.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {/* Nombre del producto seleccionado */}
                <div className={styles.productoPanelNombre}>
                  {cargando ? 'Cargando...' : producto ? producto.nombre : 'Sin datos'}
                </div>
              </div>

            </div>
          </div>

          {/* SELECTOR MOBILE/TABLET — visible solo en tablet y mobile */}
          <div className={styles.selectorMobile}>
            <select
              className={styles.vistaSelect}
              value={vistaActual}
              onChange={e => setVistaActual(e.target.value)}
            >
              {OPCIONES_VISTA.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            <div className={styles.productoPanelNombre}>
              {cargando ? 'Cargando...' : producto ? producto.nombre : 'Sin datos'}
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
              <div className={styles.chip}>
                <strong>{cargando ? '...' : kpis.total_productos}</strong> Productos
              </div>
              <div className={styles.chip}><strong>24/7</strong> Online</div>
              <div className={styles.chip}>
                <strong>{cargando ? '...' : kpis.alertas_criticas}</strong> Alertas
              </div>
            </div>
          </div>

        </section>
      </div>
    </>
  )
}