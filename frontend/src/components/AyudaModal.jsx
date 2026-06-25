// components/AyudaModal.jsx
// Modal de ayuda del sistema — se abre al hacer clic en "Conocer el sistema"

import styles from './AyudaModal.module.css'

export default function AyudaModal({ onCerrar }) {
  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.tag}>Guía rápida</span>
            <h2 className={styles.titulo}>Sistema de Gestión</h2>
            <span className={styles.sub}>Bulonera Miguel S.R.L.</span>
          </div>
          <button className={styles.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <div className={styles.separador}></div>

        {/* Módulos */}
        <div className={styles.grid}>

          <div className={styles.modulo}>
            <div className={styles.moduloIcon}>📦</div>
            <div className={styles.moduloInfo}>
              <div className={styles.moduloNombre}>Inventario</div>
              <div className={styles.moduloDesc}>Gestioná productos, categorías y ajustes de stock. Consultá el estado actual de cada artículo.</div>
            </div>
          </div>

          <div className={styles.modulo}>
            <div className={styles.moduloIcon}>🛒</div>
            <div className={styles.moduloInfo}>
              <div className={styles.moduloNombre}>Compras</div>
              <div className={styles.moduloDesc}>Registrá compras a proveedores. El stock se actualiza automáticamente al confirmar.</div>
            </div>
          </div>

          <div className={styles.modulo}>
            <div className={styles.moduloIcon}>💰</div>
            <div className={styles.moduloInfo}>
              <div className={styles.moduloNombre}>Ventas</div>
              <div className={styles.moduloDesc}>Registrá ventas al mostrador. El sistema descuenta el stock y registra el movimiento.</div>
            </div>
          </div>

          <div className={styles.modulo}>
            <div className={styles.moduloIcon}>🧾</div>
            <div className={styles.moduloInfo}>
              <div className={styles.moduloNombre}>Facturación</div>
              <div className={styles.moduloDesc}>Emití facturas A y B electrónicas con CAE de ARCA al instante. Descargá el PDF o envialo por email.</div>
            </div>
          </div>

          <div className={styles.modulo}>
            <div className={styles.moduloIcon}>📊</div>
            <div className={styles.moduloInfo}>
              <div className={styles.moduloNombre}>Reportes</div>
              <div className={styles.moduloDesc}>Consultá stock crítico, productos más vendidos, flujo de caja y más. Exportá en PDF.</div>
            </div>
          </div>

          <div className={styles.modulo}>
            <div className={styles.moduloIcon}>👥</div>
            <div className={styles.moduloInfo}>
              <div className={styles.moduloNombre}>Clientes y Proveedores</div>
              <div className={styles.moduloDesc}>Administrá clientes y proveedores. Consultá cuentas corrientes e historial de operaciones.</div>
            </div>
          </div>

        </div>

        <div className={styles.separador}></div>

        {/* Soporte */}
        <div className={styles.soporte}>
          <span className={styles.soporteLabel}>¿Necesitás ayuda?</span>
          <a
            href="https://wa.me/5493764236105"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.soporteBtn}
          >
            📱 Contactar soporte
          </a>
        </div>

      </div>
    </div>
  )
}
