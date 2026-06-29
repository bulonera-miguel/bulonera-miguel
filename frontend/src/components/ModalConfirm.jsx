// ============================================================
// ModalConfirm.jsx — Modal de confirmación reutilizable
// ============================================================

import styles from './ModalConfirm.module.css'

export default function ModalConfirm({ titulo, mensaje, onConfirmar, onCancelar, peligroso = false }) {
  return (
    <div className={styles.overlay} onClick={onCancelar}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={peligroso ? styles.iconoPeligro : styles.iconoInfo}>
            {peligroso ? '⚠' : '?'}
          </span>
          <h3 className={styles.titulo}>{titulo}</h3>
        </div>
        <p className={styles.mensaje}>{mensaje}</p>
        <div className={styles.acciones}>
          <button className={styles.btnCancelar} onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className={peligroso ? styles.btnPeligro : styles.btnConfirmar}
            onClick={onConfirmar}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}