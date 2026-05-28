import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { productosApi, categoriasApi } from '../services/api'
import styles from './Inventario.module.css'

export default function Inventario() {

  // ── ESTADOS ────────────────────────────────────────────────
  const [productos, setProductos]       = useState([])
  const [categorias, setCategorias]     = useState([])
  const [cargando, setCargando]         = useState(true)
  const [error, setError]               = useState(null)
  const [busqueda, setBusqueda]         = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  // productoEditar: si es null → estamos creando. Si tiene datos → estamos editando.

  const [form, setForm] = useState({
    codigo: '', nombre: '', descripcion: '',
    precio: '', stock_actual: '', stock_minimo: '',
    categoria_id: ''
  })

const [modalCategorias, setModalCategorias] = useState(false)
const [formCategoria, setFormCategoria]     = useState({ nombre: '' })
const [categoriaEditar, setCategoriaEditar] = useState(null)
const [errorCategoria, setErrorCategoria]   = useState(null)

  // ── CARGAR DATOS AL MONTAR ─────────────────────────────────
  useEffect(() => {
    cargarProductos()
    cargarCategorias()
  }, [])
  // [] vacío: se ejecuta solo una vez cuando el componente se monta.

  const cargarProductos = async () => {
    try {
      setCargando(true)
      const data = await productosApi.listar()
      setProductos(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
      // finally: se ejecuta siempre, haya error o no.
      // Así el spinner siempre se oculta al terminar.
    }
  }

  const cargarCategorias = async () => {
    try {
      const data = await categoriasApi.listar()
      setCategorias(data)
    } catch (e) {
      console.error('Error al cargar categorías:', e)
    }
  }

  const abrirModalCategorias = () => {
    setFormCategoria({ nombre: '' })
    setCategoriaEditar(null)
    setErrorCategoria(null)
    setModalCategorias(true)
  }

  const cerrarModalCategorias = () => {
    setModalCategorias(false)
    setCategoriaEditar(null)
    setFormCategoria({ nombre: '' })
    setErrorCategoria(null)
  }

  const guardarCategoria = async (e) => {
    e.preventDefault()
    try {
      setErrorCategoria(null)
      if (categoriaEditar) {
        await categoriasApi.actualizar(categoriaEditar.id, formCategoria)
      } else {
        await categoriasApi.crear(formCategoria)
      }
      setFormCategoria({ nombre: '' })
      setCategoriaEditar(null)
      cargarCategorias()
    } catch (e) {
      setErrorCategoria(e.message)
    }
  }

  const editarCategoria = (cat) => {
    setCategoriaEditar(cat)
    setFormCategoria({ nombre: cat.nombre })
    setErrorCategoria(null)
  }

  const eliminarCategoria = async (id, nombre) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"? Solo se puede eliminar si no tiene productos asociados.`)) return
    try {
      await categoriasApi.eliminar(id)
      cargarCategorias()
    } catch (e) {
      alert('No se puede eliminar: la categoría tiene productos asociados.')
    }
  }

  // ── BÚSQUEDA EN TIEMPO REAL ────────────────────────────────
  useEffect(() => {
    // Si la búsqueda está vacía, cargamos todos los productos
    if (busqueda.trim() === '') {
      cargarProductos()
      return
    }
    // Si hay texto, esperamos 400ms antes de buscar (debounce)
    // Evita hacer una llamada a la API por cada letra que escribe el usuario
    const timer = setTimeout(async () => {
      try {
        setCargando(true)
        const data = await productosApi.buscar(busqueda)
        setProductos(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }, 400)

    return () => clearTimeout(timer)
    // Limpia el timer anterior si el usuario sigue escribiendo
  }, [busqueda])

  // ── ABRIR MODAL ────────────────────────────────────────────
  const abrirModalCrear = () => {
    setProductoEditar(null)
    setForm({ codigo: '', nombre: '', descripcion: '',
              precio: '', stock_actual: '', stock_minimo: '',
              categoria_id: '' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (producto) => {
    setProductoEditar(producto)
    setForm({
      codigo:       producto.codigo,
      nombre:       producto.nombre,
      descripcion:  producto.descripcion || '',
      precio:       producto.precio,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      categoria_id: producto.categoria_id || ''
    })
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setProductoEditar(null)
  }

  // ── GUARDAR PRODUCTO ───────────────────────────────────────
  const guardarProducto = async (e) => {
    e.preventDefault()
    // e.preventDefault(): evita que el formulario recargue la página

    try {
      const datos = {
        ...form,
        precio:       parseFloat(form.precio),
        stock_actual: parseInt(form.stock_actual),
        stock_minimo: parseInt(form.stock_minimo),
        categoria_id: form.categoria_id || null,
      }

      if (productoEditar) {
        // Si estamos editando, no mandamos codigo ni stock_actual
        const { codigo, stock_actual, ...datosActualizar } = datos
        await productosApi.actualizar(productoEditar.id, datosActualizar)
      } else {
        await productosApi.crear(datos)
      }

      cerrarModal()
      cargarProductos()
      // Recargamos la lista para ver el producto nuevo/actualizado
    } catch (e) {
      alert(e.message)
    }
  }

  // ── ELIMINAR PRODUCTO ──────────────────────────────────────
  const eliminarProducto = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción lo desactivará del catálogo.`)) return
    try {
      await productosApi.eliminar(id)
      cargarProductos()
    } catch (e) {
      alert(e.message)
    }
  }

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── NAV ── */}
      <Navbar />  
      {/* ── HEADER ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>
            <h2>Inventario</h2>
            <span>Gestión de productos</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Link to="/" className={styles.btnVolver}>← Inicio</Link>
          <button className={styles.btnCategorias} onClick={abrirModalCategorias}>
            ☰ Categorías
          </button>
          <button className={styles.btnNuevo} onClick={abrirModalCrear}>
            + Nuevo producto
          </button>
        </div>
      </header>

      {/* ── BUSCADOR ── */}
      <div className={styles.buscadorWrap}>
        <input
          type="text"
          className={styles.buscador}
          placeholder="Buscar producto por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button className={styles.btnLimpiar} onClick={() => setBusqueda('')}>✕</button>
        )}
      </div>

      {/* ── TABLA DE PRODUCTOS ── */}
      <div className={styles.tableWrap}>
        {cargando ? (
          <div className={styles.estado}>Cargando productos...</div>
        ) : error ? (
          <div className={styles.estadoError}>{error}</div>
        ) : productos.length === 0 ? (
          <div className={styles.estado}>No se encontraron productos.</div>
        ) : (
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id} className={p.stock_actual <= p.stock_minimo ? styles.filaCritica : ''}>
                  <td className={styles.tdCodigo} data-label="Código">{p.codigo}</td>
                  <td data-label="Nombre">{p.nombre}</td>
                  <td className={styles.tdPrecio} data-label="Precio">${p.precio.toLocaleString('es-AR')}</td>
                  <td data-label="Stock" className={p.stock_actual <= p.stock_minimo ? styles.stockCritico : styles.stockOk}>
                    {p.stock_actual}
                  </td>
                  <td data-label="Mínimo">{p.stock_minimo}</td>
                  <td data-label="Estado">
                    {p.stock_actual <= p.stock_minimo
                      ? <span className={styles.badgeCritico}>⚠ Crítico</span>
                      : <span className={styles.badgeOk}>✓ Normal</span>
                    }
                  </td>
                  <td className={styles.tdAcciones} data-label="Acciones">
                    <button className={styles.btnEditar} onClick={() => abrirModalEditar(p)}>
                      Editar
                    </button>
                    <button className={styles.btnEliminar} onClick={() => eliminarProducto(p.id, p.nombre)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL CREAR/EDITAR ── */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            {/* e.stopPropagation(): evita que el clic dentro del modal
                cierre el modal (ya que el overlay sí lo cierra) */}
            <div className={styles.modalHeader}>
              <h3>{productoEditar ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button className={styles.modalCerrar} onClick={cerrarModal}>✕</button>
            </div>

            <form onSubmit={guardarProducto} className={styles.form}>
              <div className={styles.formGrid}>

                <div className={styles.formGroup}>
                  <label>Código *</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={e => setForm({...form, codigo: e.target.value})}
                    disabled={!!productoEditar}
                    // El código no se puede cambiar al editar
                    required
                    placeholder="Ej: BUL-M10-50"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Categoría</label>
                  <select
                    value={form.categoria_id}
                    onChange={e => setForm({...form, categoria_id: e.target.value})}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm({...form, nombre: e.target.value})}
                    required
                    placeholder="Ej: Bulón hexagonal M10 x 50mm zinc"
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Descripción</label>
                  <textarea
                    value={form.descripcion}
                    onChange={e => setForm({...form, descripcion: e.target.value})}
                    placeholder="Descripción opcional del producto"
                    rows={2}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Precio *</label>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={e => setForm({...form, precio: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Stock inicial</label>
                  <input
                    type="number"
                    value={form.stock_actual}
                    onChange={e => setForm({...form, stock_actual: e.target.value})}
                    disabled={!!productoEditar}
                    // El stock no se edita directamente — se hace por movimientos
                    min="0"
                    placeholder="0"
                  />
                  {productoEditar && (
                    <small>El stock se modifica desde la sección Stock</small>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Stock mínimo *</label>
                  <input
                    type="number"
                    value={form.stock_minimo}
                    onChange={e => setForm({...form, stock_minimo: e.target.value})}
                    required
                    min="0"
                    placeholder="0"
                  />
                </div>

              </div>

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnCancelar} onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnGuardar}>
                  {productoEditar ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CATEGORÍAS ── */}
      {modalCategorias && (
        <div className={styles.modalOverlay} onClick={cerrarModalCategorias}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Gestión de Categorías</h3>
              <button className={styles.modalCerrar} onClick={cerrarModalCategorias}>✕</button>
            </div>

            <div className={styles.modalBody}>

              {/* Formulario alta/edición */}
              <form onSubmit={guardarCategoria} className={styles.formCategoria}>
                <div className={styles.formCategoriaRow}>
                  <input
                    type="text"
                    placeholder="Nombre de la categoría..."
                    value={formCategoria.nombre}
                    onChange={e => setFormCategoria({ nombre: e.target.value })}
                    required
                    className={styles.inputCategoria}
                  />
                  <button type="submit" className={styles.btnGuardar}>
                    {categoriaEditar ? 'Guardar' : '+ Agregar'}
                  </button>
                  {categoriaEditar && (
                    <button
                      type="button"
                      className={styles.btnCancelar}
                      onClick={() => { setCategoriaEditar(null); setFormCategoria({ nombre: '' }) }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                {errorCategoria && (
                  <div className={styles.errorCategoria}>{errorCategoria}</div>
                )}
              </form>

              {/* Lista de categorías */}
              <div className={styles.listaCategorias}>
                {categorias.length === 0 ? (
                  <div className={styles.sinCategorias}>No hay categorías creadas todavía</div>
                ) : (
                  categorias.map(cat => (
                    <div key={cat.id} className={styles.categoriaItem}>
                      <span className={styles.categoriaNombre}>{cat.nombre}</span>
                      <div className={styles.categoriaAcciones}>
                        <button
                          className={styles.btnEditarCat}
                          onClick={() => editarCategoria(cat)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.btnEliminarCat}
                          onClick={() => eliminarCategoria(cat.id, cat.nombre)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}