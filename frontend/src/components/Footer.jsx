// ============================================================
// Footer.jsx — Pie de página
// Bulonera Miguel — Sistema de Gestión
// ============================================================

import styles from './Footer.module.css'

export default function Footer() {
  const anio = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.contenido}>

        {/* Columna izquierda — datos empresa */}
        <div className={styles.col}>
          <div className={styles.logoWrap}>
            <div className={styles.logoIcono}>
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoSvg}>
                <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="#00C8F0" strokeWidth="1.5" fill="none"/>
                <circle cx="16" cy="16" r="4" fill="#00C8F0" opacity="0.8"/>
                <line x1="16" y1="6" x2="16" y2="12" stroke="#00C8F0" strokeWidth="1.2"/>
                <line x1="16" y1="20" x2="16" y2="26" stroke="#00C8F0" strokeWidth="1.2"/>
                <line x1="6" y1="11" x2="12" y2="14" stroke="#00C8F0" strokeWidth="1.2"/>
                <line x1="20" y1="18" x2="26" y2="21" stroke="#00C8F0" strokeWidth="1.2"/>
                <line x1="6" y1="21" x2="12" y2="18" stroke="#00C8F0" strokeWidth="1.2"/>
                <line x1="20" y1="14" x2="26" y2="11" stroke="#00C8F0" strokeWidth="1.2"/>
              </svg>
            </div>
            <div>
              <div className={styles.logoNombre}>Bulonera Miguel</div>
              <div className={styles.logoSub}>Sistema de Gestión</div>
            </div>
          </div>
          <div className={styles.empresa}>
            <span>Bulonera Miguel S.R.L.</span>
            <span>CUIT: 20-18572102-8</span>
            <span>Av. Buchardo 2268, Posadas, Misiones</span>
          </div>
        </div>

        {/* Columna central — contacto */}
        <div className={styles.col}>
          <div className={styles.colTitulo}>Contacto</div>
          <div className={styles.colItems}>
            <span>📞 0376 4236105</span>
            <span>✉ bulonera.miguel@gmail.com</span>
            <span>🕐 Lun–Vie 8:00 – 18:30</span>
            <span>🕐 Sáb 8:00 – 18:00</span>
          </div>
        </div>

        {/* Columna derecha — sistema */}
        <div className={styles.col}>
          <div className={styles.colTitulo}>Sistema</div>
          <div className={styles.colItems}>
            <span>Facturación electrónica ARCA</span>
            <span>Gestión de inventario y stock</span>
            <span>Reportes y análisis</span>
            <span>Cuenta corriente de clientes</span>
          </div>
        </div>

      </div>

      {/* Línea divisora */}
      <div className={styles.divider}></div>

      {/* Barra inferior */}
      <div className={styles.barraInferior}>
        <span className={styles.copyright}>
          © {anio} Bulonera Miguel S.R.L. — Todos los derechos reservados
        </span>
        <span className={styles.desarrollado}>
          Desarrollado por <span className={styles.dev}>Pablo Almada</span>
        </span>
      </div>
    </footer>
  )
}
