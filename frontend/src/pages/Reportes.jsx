import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { categoriasApi } from '../services/api'
import styles from './Reportes.module.css'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, LineChart, Line, ScatterChart, Scatter,
  ReferenceLine, LabelList, ComposedChart, Area
} from 'recharts'

// ── CONFIGURACIÓN DE REPORTES ──────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const REPORTES = [
  { id: 'stock-critico',     label: 'Stock Crítico',        icono: '⚠',  desc: 'Productos bajo el mínimo' },
  { id: 'mas-vendidos',      label: 'Más Vendidos',          icono: '↑',  desc: 'Mayor rotación de salidas' },
  { id: 'menos-vendidos',    label: 'Menos Vendidos',        icono: '↓',  desc: 'Menor rotación de salidas' },
  { id: 'inventario-actual', label: 'Inventario Actual',     icono: '▦',  desc: 'Estado actual del stock' },
  { id: 'productos-baja',    label: 'Productos de Baja',     icono: '✕',  desc: 'Dados de baja del sistema' },
  { id: 'deuda-proveedores', label: 'Compras por Proveedor', icono: '₱',  desc: 'Total comprado por proveedor' },
  { id: 'ventas-clientes',   label: 'Ventas por Cliente',    icono: '$',  desc: 'Ingreso por cliente' },
  { id: 'flujo-caja',        label: 'Flujo de Caja',         icono: '⇅',  desc: 'Ingresos y egresos reales' },
]

// Colores del sistema
const C = {
  cyan:    '#00C8F0',
  verde:   '#00E87A',
  rojo:    '#FF4444',
  amarillo:'#FFB800',
  dim:     'rgba(200,228,244,0.18)',
  text:    '#EAF4FF',
  textMid: 'rgba(200,228,244,0.60)',
}

// ── TOOLTIP PERSONALIZADO ──────────────────────────────────────────────────────
const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipRow}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{typeof p.value === 'number' ? p.value.toLocaleString('es-AR') : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────────
export default function Reportes() {

  // ── ESTADOS ─────────────────────────────────────────────
  const [reporteActivo, setReporteActivo]   = useState('stock-critico')
  const [datos, setDatos]                   = useState([])
  const [categorias, setCategorias]         = useState([])
  const [cargando, setCargando]             = useState(false)
  const [error, setError]                   = useState(null)
  const [filaResaltada, setFilaResaltada]   = useState(null)
  const [vista, setVista]                   = useState('ambos')

  const [filtros, setFiltros] = useState({
    desde:        '',
    hasta:        '',
    nombre:       '',
    codigo:       '',
    categoria_id: '',
  })

  const [filtroProveedor, setFiltroProveedor] = useState('')

  // ── CARGAR CATEGORÍAS ────────────────────────────────────
  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch(console.error)
  }, [])

  // ── CONSTRUIR URL CON FILTROS ────────────────────────────
  const construirUrl = useCallback((reporteId) => {
    if (reporteId === 'deuda-proveedores') {
      const p = new URLSearchParams()
      if (filtros.desde)   p.append('desde',  filtros.desde)
      if (filtros.hasta)   p.append('hasta',  filtros.hasta)
      if (filtroProveedor) p.append('nombre', filtroProveedor)
      return `${BASE_URL}/api/compras/reportes/deuda-mensual?${p.toString()}`
    }
    if (reporteId === 'ventas-clientes') {
      const p = new URLSearchParams()
      if (filtros.desde) p.append('desde', filtros.desde)
      if (filtros.hasta) p.append('hasta', filtros.hasta)
      return `${BASE_URL}/api/ventas/reportes/ventas-clientes?${p.toString()}`
    }
    if (reporteId === 'flujo-caja') {
      const p = new URLSearchParams()
      if (filtros.desde) p.append('desde', filtros.desde)
      if (filtros.hasta) p.append('hasta', filtros.hasta)
      return `${BASE_URL}/api/flujo-caja/?${p.toString()}`
    }
    const params = new URLSearchParams()
    if (filtros.desde)        params.append('desde',        filtros.desde)
    if (filtros.hasta)        params.append('hasta',        filtros.hasta)
    if (filtros.nombre)       params.append('nombre',       filtros.nombre)
    if (filtros.codigo)       params.append('codigo',       filtros.codigo)
    if (filtros.categoria_id) params.append('categoria_id', filtros.categoria_id)
    const qs = params.toString()
    return `${BASE_URL}/api/reportes/${reporteId}${qs ? '?' + qs : ''}`
  }, [filtros, filtroProveedor])

  // ── CONSTRUIR URL PDF ────────────────────────────────────
  const construirUrlPDF = useCallback(() => {
    if (reporteActivo === 'deuda-proveedores') {
      const p = new URLSearchParams()
      if (filtros.desde)   p.append('desde',  filtros.desde)
      if (filtros.hasta)   p.append('hasta',  filtros.hasta)
      if (filtroProveedor) p.append('nombre', filtroProveedor)
      return `${BASE_URL}/api/compras/reportes/deuda-mensual/pdf?${p.toString()}`
    }
    if (reporteActivo === 'ventas-clientes') {
      const p = new URLSearchParams()
      if (filtros.desde) p.append('desde', filtros.desde)
      if (filtros.hasta) p.append('hasta', filtros.hasta)
      return `${BASE_URL}/api/ventas/reportes/ventas-clientes/pdf?${p.toString()}`
    }
    if (reporteActivo === 'flujo-caja') {
      const p = new URLSearchParams()
      if (filtros.desde) p.append('desde', filtros.desde)
      if (filtros.hasta) p.append('hasta', filtros.hasta)
      return `${BASE_URL}/api/flujo-caja/pdf?${p.toString()}`
    }
    // Reportes estándar
    const params = new URLSearchParams()
    if (filtros.desde)        params.append('desde',        filtros.desde)
    if (filtros.hasta)        params.append('hasta',        filtros.hasta)
    if (filtros.nombre)       params.append('nombre',       filtros.nombre)
    if (filtros.codigo)       params.append('codigo',       filtros.codigo)
    if (filtros.categoria_id) params.append('categoria_id', filtros.categoria_id)
    const qs = params.toString()
    return `${BASE_URL}/api/reportes/${reporteActivo}/pdf${qs ? '?' + qs : ''}`
  }, [reporteActivo, filtros, filtroProveedor])

  // ── EJECUTAR REPORTE ─────────────────────────────────────
  const ejecutarReporte = useCallback(async (reporteId = reporteActivo) => {
    try {
      setCargando(true)
      setError(null)
      setFilaResaltada(null)
      const res = await fetch(construirUrl(reporteId))
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Error al obtener el reporte')
      }
      const data = await res.json()
      setDatos(data)
    } catch (e) {
      setError(e.message)
      setDatos([])
    } finally {
      setCargando(false)
    }
  }, [reporteActivo, construirUrl])

  const descargarPDF = () => {
    window.open(construirUrlPDF(), '_blank')
  }

  // Ejecutar automáticamente al cambiar de reporte
  useEffect(() => {
    ejecutarReporte(reporteActivo)
  }, [reporteActivo])

  // ── CAMBIAR REPORTE ──────────────────────────────────────
  const cambiarReporte = (id) => {
    setReporteActivo(id)
    setDatos([])
    setError(null)
    setFilaResaltada(null)
  }

  // ── FORMATEAR NÚMEROS ────────────────────────────────────
  const fmt      = (n) => Number(n).toLocaleString('es-AR')
  const fmtP     = (n) => `$${Number(n).toLocaleString('es-AR')}`
  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—'
  const nombreCorto = (nombre, max = 18) =>
    nombre?.length > max ? nombre.slice(0, max) + '…' : nombre

  // ── COLUMNAS DE TABLA ─────────────────────────────────────
  const columnas = {
    'stock-critico': [
      { key: 'codigo',       label: 'Código'       },
      { key: 'nombre',       label: 'Producto'     },
      { key: 'stock_actual', label: 'Stock actual', render: (v) => <span className={styles.valorRojo}>{v}</span> },
      { key: 'stock_minimo', label: 'Stock mínimo' },
      { key: '_deficit',     label: 'Déficit',
        render: (_, row) => <span className={styles.valorRojo}>-{row.stock_minimo - row.stock_actual}</span> },
    ],
    'mas-vendidos': [
      { key: 'codigo',               label: 'Código'    },
      { key: 'nombre',               label: 'Producto'  },
      { key: 'total_salidas',        label: 'Unidades vendidas', render: (v) => <span className={styles.valorVerde}>{fmt(v)}</span> },
      { key: 'cantidad_movimientos', label: 'Movimientos' },
      { key: 'precio',               label: 'Precio unit.', render: (v) => fmtP(v) },
    ],
    'menos-vendidos': [
      { key: 'codigo',        label: 'Código'    },
      { key: 'nombre',        label: 'Producto'  },
      { key: 'total_salidas', label: 'Unidades vendidas', render: (v) => <span className={styles.valorAmarillo}>{fmt(v)}</span> },
      { key: 'stock_actual',  label: 'Stock actual' },
      { key: 'precio',        label: 'Precio unit.', render: (v) => fmtP(v) },
    ],
    'inventario-actual': [
      { key: 'codigo',         label: 'Código'   },
      { key: 'nombre',         label: 'Producto' },
      { key: 'stock_actual',   label: 'Stock',   render: (v, row) =>
          <span className={row.estado === 'critico' ? styles.valorRojo : styles.valorVerde}>{v}</span> },
      { key: 'precio',         label: 'Precio',  render: (v) => fmtP(v) },
      { key: 'valor_en_stock', label: 'Valor total', render: (v) => <span className={styles.valorCyan}>{fmtP(v)}</span> },
      { key: 'estado',         label: 'Estado',  render: (v) =>
          <span className={v === 'critico' ? styles.badgeCritico : styles.badgeNormal}>
            {v === 'critico' ? '⚠ Crítico' : '✓ Normal'}
          </span> },
    ],
    'productos-baja': [
      { key: 'codigo',       label: 'Código'    },
      { key: 'nombre',       label: 'Producto'  },
      { key: 'precio',       label: 'Precio',   render: (v) => fmtP(v) },
      { key: 'stock_actual', label: 'Stock al dar de baja' },
      { key: 'updated_at',   label: 'Fecha de baja', render: (v) => fmtFecha(v) },
    ],
    'deuda-proveedores': [
      { key: 'nombre',         label: 'Proveedor'     },
      { key: 'cuit',           label: 'CUIT'          },
      { key: 'cant_compras',   label: 'Cant. compras' },
      { key: 'total_comprado', label: 'Total comprado',
        render: (v) => <span className={styles.valorCyan}>{fmtP(v)}</span> },
    ],
    'ventas-clientes': [
      { key: 'nombre',      label: 'Cliente'       },
      { key: 'cant_ventas', label: 'Cant. ventas'  },
      { key: 'total_ventas',label: 'Total vendido',
        render: (v) => <span className={styles.valorVerde}>{fmtP(v)}</span> },
    ],
    'flujo-caja': [
      { key: 'mes_nombre', label: 'Mes' },
      { key: 'ingresos',   label: 'Ingresos cobrados',
        render: (v) => <span className={styles.valorVerde}>{fmtP(v)}</span> },
      { key: 'egresos',    label: 'Egresos pagados',
        render: (v) => <span className={styles.valorRojo}>{fmtP(v)}</span> },
      { key: 'neto',       label: 'Resultado neto',
        render: (v) => <span className={v >= 0 ? styles.valorVerde : styles.valorRojo}>{fmtP(v)}</span> },
      { key: 'estado',     label: 'Estado',
        render: (v) => <span className={v === 'positivo' ? styles.badgeNormal : styles.badgeCritico}>
          {v === 'positivo' ? '✓ Positivo' : '✕ Negativo'}
        </span> },
    ],
  }

  // ── GRÁFICOS ──────────────────────────────────────────────
  const renderGraficos = () => {
    if (!datos.length) return null

    const colorBarra = (index, baseColor) =>
      filaResaltada === null || filaResaltada === index ? baseColor : 'rgba(200,228,244,0.12)'

    switch (reporteActivo) {

      case 'stock-critico': {
        const chartData = datos.slice(0, 15).map((p, i) => ({
          name:    nombreCorto(p.nombre),
          actual:  p.stock_actual,
          minimo:  p.stock_minimo,
          deficit: p.stock_minimo - p.stock_actual,
          index:   i,
        }))
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Stock actual vs mínimo requerido</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical" barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Bar dataKey="actual" name="Stock actual" radius={[0,3,3,0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={colorBarra(i, C.rojo)} />)}
                    <LabelList dataKey="actual" position="right" style={{ fill: C.rojo, fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                  <Bar dataKey="minimo" name="Stock mínimo" radius={[0,3,3,0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={colorBarra(i, 'rgba(255,68,68,0.25)')} />)}
                    <LabelList dataKey="minimo" position="right" style={{ fill: 'rgba(255,68,68,0.55)', fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Déficit por producto (unidades faltantes)</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.textMid, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Bar dataKey="deficit" name="Déficit" radius={[3,3,0,0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={colorBarra(i, C.amarillo)} />)}
                    <LabelList dataKey="deficit" position="top" style={{ fill: C.amarillo, fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      case 'mas-vendidos': {
        const top10 = datos.slice(0, 10)
        const chartBar = top10.map((p, i) => ({ name: nombreCorto(p.nombre), ventas: p.total_salidas, index: i }))
        const chartPie = top10.map((p, i) => ({ name: nombreCorto(p.nombre, 14), value: p.total_salidas, index: i }))
        const COLORES_PIE = [C.cyan, C.verde, C.amarillo, '#7B61FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C3A6FF']
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Top 10 — unidades despachadas</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartBar} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.textMid, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Bar dataKey="ventas" name="Unidades" radius={[4,4,0,0]}>
                    {chartBar.map((_, i) => <Cell key={i} fill={colorBarra(i, C.verde)} />)}
                    <LabelList dataKey="ventas" position="top" style={{ fill: C.verde, fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Participación en ventas (%)</div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={chartPie} cx="50%" cy="45%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value">
                    {chartPie.map((_, i) => (
                      <Cell key={i}
                        fill={filaResaltada === null || filaResaltada === i ? COLORES_PIE[i % COLORES_PIE.length] : 'rgba(200,228,244,0.08)'}
                        stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipCustom />} />
                  <Legend formatter={(v) => <span style={{ color: C.textMid, fontSize: 11 }}>{v}</span>} iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      case 'menos-vendidos': {
        const top15 = datos.slice(0, 15)
        const chartBar     = top15.map((p, i) => ({ name: nombreCorto(p.nombre), ventas: p.total_salidas, index: i }))
        const chartScatter = top15.map((p, i) => ({ stock: p.stock_actual, ventas: p.total_salidas, name: p.nombre, index: i }))
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Unidades despachadas (menor a mayor)</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartBar} layout="vertical" barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Bar dataKey="ventas" name="Unidades" radius={[0,3,3,0]}>
                    {chartBar.map((_, i) => <Cell key={i} fill={colorBarra(i, C.amarillo)} />)}
                    <LabelList dataKey="ventas" position="right" style={{ fill: C.amarillo, fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Stock disponible vs ventas — ¿inmovilizado?</div>
              <div className={styles.graficoSubtitulo}>Puntos arriba-izquierda = alto stock, pocas ventas</div>
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} />
                  <XAxis dataKey="ventas" name="Ventas" type="number" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Ventas', position: 'insideBottom', offset: -4, fill: C.textMid, fontSize: 11 }} />
                  <YAxis dataKey="stock"  name="Stock"  type="number" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Stock', angle: -90, position: 'insideLeft', fill: C.textMid, fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3', stroke: C.cyan }} content={<TooltipCustom />} />
                  <Scatter data={chartScatter} name="Productos">
                    {chartScatter.map((_, i) => (
                      <Cell key={i}
                        fill={filaResaltada === i ? C.cyan : colorBarra(i, C.amarillo)}
                        opacity={filaResaltada === null || filaResaltada === i ? 1 : 0.3} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      case 'inventario-actual': {
        const top12 = [...datos].sort((a, b) => b.valor_en_stock - a.valor_en_stock).slice(0, 12)
        const chartBar = top12.map((p, i) => ({ name: nombreCorto(p.nombre), valor: p.valor_en_stock, index: datos.indexOf(p) }))
        const criticos = datos.filter(p => p.estado === 'critico').length
        const normales = datos.length - criticos
        const chartPie = [
          { name: 'Normal',  value: normales, color: C.verde },
          { name: 'Crítico', value: criticos, color: C.rojo  },
        ]
        const valorTotal = datos.reduce((s, p) => s + p.valor_en_stock, 0)
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Top 12 — capital inmovilizado en stock ($)</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartBar} layout="vertical" barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} formatter={(v) => [`$${fmt(v)}`, 'Valor en stock']} />
                  <Bar dataKey="valor" name="Valor en stock" radius={[0,3,3,0]}>
                    {chartBar.map((entry, i) => <Cell key={i} fill={colorBarra(entry.index, C.cyan)} />)}
                    <LabelList dataKey="valor" position="right" formatter={v => `$${(v/1000).toFixed(0)}k`} style={{ fill: C.cyan, fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Estado del inventario</div>
              <div className={styles.kpiValorTotal}>
                <span className={styles.kpiLabel}>Valor total en stock</span>
                <span className={styles.kpiValor}>{fmtP(valorTotal)}</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chartPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {chartPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip content={<TooltipCustom />} />
                  <Legend formatter={(v, entry) => <span style={{ color: entry.color, fontSize: 12 }}>{v}</span>} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      case 'productos-baja': {
        const bajasPorMes = {}
        datos.forEach(p => {
          const mes = p.updated_at
            ? new Date(p.updated_at).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
            : 'Sin fecha'
          bajasPorMes[mes] = (bajasPorMes[mes] || 0) + 1
        })
        const chartLine = Object.entries(bajasPorMes).map(([mes, cantidad]) => ({ mes, cantidad }))
        const valorStockPerdido = datos.reduce((s, p) => s + (p.precio * p.stock_actual), 0)
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>KPIs del período</div>
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Total de bajas</span>
                  <span className={styles.kpiCardValor} style={{ color: C.rojo }}>{datos.length}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Stock inmovilizado</span>
                  <span className={styles.kpiCardValor} style={{ color: C.amarillo }}>{fmtP(valorStockPerdido)}</span>
                </div>
              </div>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Bajas registradas por mes</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartLine}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} />
                  <XAxis dataKey="mes" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Line type="monotone" dataKey="cantidad" name="Bajas" stroke={C.rojo} strokeWidth={2} dot={{ fill: C.rojo, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      case 'deuda-proveedores': {
        const chartBar = datos.slice(0, 12).map((p, i) => ({ name: nombreCorto(p.nombre, 16), total: p.total_comprado, index: i }))
        const totalGeneral = datos.reduce((s, p) => s + p.total_comprado, 0)
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Compras por proveedor</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartBar} layout="vertical" barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} formatter={(v) => [`$${fmt(v)}`, 'Total comprado']} />
                  <Bar dataKey="total" name="Total comprado" radius={[0,3,3,0]}>
                    {chartBar.map((_, i) => <Cell key={i} fill={colorBarra(i, C.cyan)} />)}
                    <LabelList dataKey="total" position="right" formatter={v => `$${(v/1000).toFixed(0)}k`} style={{ fill: C.cyan, fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Resumen del período</div>
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Total proveedores</span>
                  <span className={styles.kpiCardValor} style={{ color: C.cyan }}>{datos.length}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Total comprado</span>
                  <span className={styles.kpiCardValor} style={{ color: C.amarillo }}>{fmtP(totalGeneral)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      }

      case 'ventas-clientes': {
        const chartBar = datos.slice(0, 10).map((p, i) => ({ name: nombreCorto(p.nombre, 16), ventas: p.total_ventas, index: i }))
        const totalGeneral = datos.reduce((s, p) => s + p.total_ventas, 0)
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Top 10 — ingreso por cliente</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartBar} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.textMid, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipCustom />} formatter={(v) => [`$${fmt(v)}`, 'Total vendido']} />
                  <Bar dataKey="ventas" name="Total vendido" radius={[4,4,0,0]}>
                    {chartBar.map((_, i) => <Cell key={i} fill={colorBarra(i, C.verde)} />)}
                    <LabelList dataKey="ventas" position="top" formatter={v => `$${(v/1000).toFixed(0)}k`} style={{ fill: C.verde, fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Resumen del período</div>
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Total clientes</span>
                  <span className={styles.kpiCardValor} style={{ color: C.verde }}>{datos.length}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Total facturado</span>
                  <span className={styles.kpiCardValor} style={{ color: C.cyan }}>{fmtP(totalGeneral)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      }

      // ── FLUJO DE CAJA ──────────────────────────────────────
      case 'flujo-caja': {
        const totalIngresos = datos.reduce((s, d) => s + d.ingresos, 0)
        const totalEgresos  = datos.reduce((s, d) => s + d.egresos,  0)
        const totalNeto     = totalIngresos - totalEgresos
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Ingresos vs Egresos por mes</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={datos} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} vertical={false} />
                  <XAxis dataKey="mes_nombre" tick={{ fill: C.textMid, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipCustom />} formatter={(v) => [`$${fmt(v)}`]} />
                  <Bar dataKey="ingresos" name="Ingresos" fill={C.verde} radius={[3,3,0,0]} />
                  <Bar dataKey="egresos"  name="Egresos"  fill={C.rojo}  radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Resultado neto por mes</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={datos}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} />
                  <XAxis dataKey="mes_nombre" tick={{ fill: C.textMid, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipCustom />} formatter={(v) => [`$${fmt(v)}`, 'Neto']} />
                  <ReferenceLine y={0} stroke={C.textMid} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="neto" name="Neto" stroke={C.cyan} strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      return <circle key={cx} cx={cx} cy={cy} r={4}
                        fill={payload.neto >= 0 ? C.verde : C.rojo}
                        stroke="transparent" />
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className={styles.kpiGrid} style={{ marginTop: 12 }}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Total ingresos</span>
                  <span className={styles.kpiCardValor} style={{ color: C.verde }}>{fmtP(totalIngresos)}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Total egresos</span>
                  <span className={styles.kpiCardValor} style={{ color: C.rojo }}>{fmtP(totalEgresos)}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiCardLabel}>Resultado neto</span>
                  <span className={styles.kpiCardValor} style={{ color: totalNeto >= 0 ? C.verde : C.rojo }}>
                    {fmtP(totalNeto)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      }

      default: return null
    }
  }

  // ── RENDER TABLA ──────────────────────────────────────────
  const renderTabla = () => {
    const cols = columnas[reporteActivo] || []
    if (!datos.length) return (
      <div className={styles.tablaVacia}>
        {cargando ? 'Generando reporte...' : 'Sin datos para los filtros seleccionados'}
      </div>
    )
    return (
      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {datos.map((row, i) => (
              <tr key={i}
                className={`${filaResaltada === i ? styles.filaResaltada : ''}`}
                onClick={() => setFilaResaltada(filaResaltada === i ? null : i)}
                title="Clic para resaltar en el gráfico">
                {cols.map(c => (
                  <td key={c.key} data-label={c.label}>
                    {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const reporteInfo = REPORTES.find(r => r.id === reporteActivo)

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.contenido}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Reportes</h2>
            <span className={styles.pageSubtitle}>Análisis y visualización de datos</span>
          </div>
          {datos.length > 0 && (
            <div className={styles.contadorResultados}>
              <span className={styles.contadorNum}>{datos.length}</span>
              <span className={styles.contadorLabel}>resultados</span>
            </div>
          )}
        </div>

        {/* SELECTOR */}
        <div className={styles.selectorReportes}>
          {REPORTES.map(r => (
            <button key={r.id}
              className={`${styles.selectorBtn} ${reporteActivo === r.id ? styles.selectorBtnActivo : ''}`}
              onClick={() => cambiarReporte(r.id)}>
              <span className={styles.selectorIcono}>{r.icono}</span>
              <span className={styles.selectorLabel}>{r.label}</span>
              <span className={styles.selectorDesc}>{r.desc}</span>
            </button>
          ))}
        </div>

        {/* FILTROS */}
        <div className={styles.filtrosPanel}>
          <div className={styles.filtrosTitulo}>Filtros</div>
          <div className={styles.filtrosGrid}>

            {/* Nombre — solo reportes de productos */}
            {reporteActivo !== 'deuda-proveedores' && reporteActivo !== 'ventas-clientes' && reporteActivo !== 'flujo-caja' && (
              <div className={styles.filtroGrupo}>
                <label>Nombre</label>
                <input type="text" className={styles.filtroInput}
                  placeholder="Buscar por nombre..."
                  value={filtros.nombre}
                  onChange={e => setFiltros({...filtros, nombre: e.target.value})} />
              </div>
            )}

            {/* Código — solo reportes de productos */}
            {reporteActivo !== 'deuda-proveedores' && reporteActivo !== 'ventas-clientes' && reporteActivo !== 'flujo-caja' && (
              <div className={styles.filtroGrupo}>
                <label>Código</label>
                <input type="text" className={styles.filtroInput}
                  placeholder="Ej: BUL-M10"
                  value={filtros.codigo}
                  onChange={e => setFiltros({...filtros, codigo: e.target.value})} />
              </div>
            )}

            {/* Categoría — solo reportes de productos */}
            {reporteActivo !== 'deuda-proveedores' && reporteActivo !== 'ventas-clientes' && reporteActivo !== 'flujo-caja' && (
              <div className={styles.filtroGrupo}>
                <label>Categoría</label>
                <select className={styles.filtroInput}
                  value={filtros.categoria_id}
                  onChange={e => setFiltros({...filtros, categoria_id: e.target.value})}>
                  <option value="">Todas</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            {/* Fechas */}
            {reporteActivo !== 'stock-critico' && reporteActivo !== 'inventario-actual' && (
              <>
                <div className={styles.filtroGrupo}>
                  <label>Desde</label>
                  <input type="date" className={styles.filtroInput}
                    value={filtros.desde}
                    onChange={e => setFiltros({...filtros, desde: e.target.value})} />
                </div>
                <div className={styles.filtroGrupo}>
                  <label>Hasta</label>
                  <input type="date" className={styles.filtroInput}
                    value={filtros.hasta}
                    onChange={e => setFiltros({...filtros, hasta: e.target.value})} />
                </div>
              </>
            )}

            {/* Filtro Proveedor */}
            {reporteActivo === 'deuda-proveedores' && (
              <div className={styles.filtroGrupo}>
                <label>Proveedor</label>
                <input type="text" className={styles.filtroInput}
                  placeholder="Nombre del proveedor..."
                  value={filtroProveedor}
                  onChange={e => setFiltroProveedor(e.target.value)} />
              </div>
            )}

            {/* Filtro Cliente */}
            {reporteActivo === 'ventas-clientes' && (
              <div className={styles.filtroGrupo}>
                <label>Cliente</label>
                <input type="text" className={styles.filtroInput}
                  placeholder="Nombre del cliente..."
                  value={filtroProveedor}
                  onChange={e => setFiltroProveedor(e.target.value)} />
              </div>
            )}

            <div className={styles.filtroAcciones}>
              <button className={styles.btnAplicar} onClick={() => ejecutarReporte()}>
                ▶ Generar reporte
              </button>
              <button className={styles.btnLimpiar} onClick={() => {
                setFiltros({ desde: '', hasta: '', nombre: '', codigo: '', categoria_id: '' })
                setFiltroProveedor('')
                setDatos([])
                setError(null)
                setFilaResaltada(null)
              }}>
                ✕ Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className={styles.errorMsg}>
            <span className={styles.errorIcono}>⚠</span>
            {error}
          </div>
        )}

        {/* TOGGLE VISTA */}
        {!cargando && datos.length > 0 && (
          <div className={styles.vistaToggle}>
            <span className={styles.vistaLabel}>Vista:</span>
            {[
              { id: 'ambos',   label: '▦ Tabla + Gráficos' },
              { id: 'tabla',   label: '≡ Solo tabla'        },
              { id: 'grafico', label: '◉ Solo gráficos'     },
            ].map(v => (
              <button key={v.id}
                className={`${styles.vistaBtn} ${vista === v.id ? styles.vistaBtnActivo : ''}`}
                onClick={() => setVista(v.id)}>
                {v.label}
              </button>
            ))}
            <span className={styles.vistaHint}>
              Clic en una fila de la tabla para resaltar en el gráfico
            </span>
            <button className={styles.btnDescargarPDF} onClick={descargarPDF}
              title="Descargar reporte como PDF">
              ↓ PDF
            </button>
          </div>
        )}

        {/* CARGANDO */}
        {cargando && (
          <div className={styles.cargando}>
            <div className={styles.cargandoSpinner}></div>
            <span>Generando reporte...</span>
          </div>
        )}

        {/* CONTENIDO */}
        {!cargando && datos.length > 0 && (
          <div className={`${styles.mainGrid} ${styles['mainGrid_' + vista]}`}>
            {(vista === 'ambos' || vista === 'tabla') && (
              <div className={styles.tablaPanel}>
                <div className={styles.tablaPanelHeader}>
                  <span className={styles.panelTitulo}>{reporteInfo?.label}</span>
                  <span className={styles.panelContador}>{datos.length} registros</span>
                </div>
                {renderTabla()}
              </div>
            )}
            {(vista === 'ambos' || vista === 'grafico') && (
              <div className={styles.graficosPanel}>
                <div className={styles.graficosHeader}>
                  <span className={styles.panelTitulo}>Visualización</span>
                </div>
                {renderGraficos()}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
