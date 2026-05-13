import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { categoriasApi } from '../services/api'
import styles from './Reportes.module.css'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, LineChart, Line, ScatterChart, Scatter,
  ReferenceLine, LabelList
} from 'recharts'

// ── CONFIGURACIÓN DE REPORTES ──────────────────────────────────────────────────
const BASE_URL = 'http://localhost:8000'

const REPORTES = [
  { id: 'stock-critico',     label: 'Stock Crítico',      icono: '⚠',  desc: 'Productos bajo el mínimo' },
  { id: 'mas-vendidos',      label: 'Más Vendidos',        icono: '↑',  desc: 'Mayor rotación de salidas' },
  { id: 'menos-vendidos',    label: 'Menos Vendidos',      icono: '↓',  desc: 'Menor rotación de salidas' },
  { id: 'inventario-actual', label: 'Inventario Actual',   icono: '▦',  desc: 'Estado actual del stock' },
  { id: 'productos-baja',    label: 'Productos de Baja',   icono: '✕',  desc: 'Dados de baja del sistema' },
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
  // filaResaltada: índice de la fila clickeada — resalta en tabla y gráfico

  // Vista: 'ambos' | 'tabla' | 'grafico'
  const [vista, setVista]                   = useState('ambos')

  // Filtros
  const [filtros, setFiltros] = useState({
    desde:        '',
    hasta:        '',
    nombre:       '',
    codigo:       '',
    categoria_id: '',
  })

  // ── CARGAR CATEGORÍAS ────────────────────────────────────
  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch(console.error)
  }, [])

  // ── CONSTRUIR URL CON FILTROS ────────────────────────────
  const construirUrl = useCallback((reporteId) => {
    const params = new URLSearchParams()
    if (filtros.desde)        params.append('desde',        filtros.desde)
    if (filtros.hasta)        params.append('hasta',        filtros.hasta)
    if (filtros.nombre)       params.append('nombre',       filtros.nombre)
    if (filtros.codigo)       params.append('codigo',       filtros.codigo)
    if (filtros.categoria_id) params.append('categoria_id', filtros.categoria_id)
    const qs = params.toString()
    return `${BASE_URL}/api/reportes/${reporteId}${qs ? '?' + qs : ''}`
  }, [filtros])

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
  const fmt  = (n) => Number(n).toLocaleString('es-AR')
  const fmtP = (n) => `$${Number(n).toLocaleString('es-AR')}`
  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—'

  // ── NOMBRE CORTO PARA GRÁFICOS ───────────────────────────
  const nombreCorto = (nombre, max = 18) =>
    nombre?.length > max ? nombre.slice(0, max) + '…' : nombre

  // ════════════════════════════════════════════════════════
  // CONFIGURACIÓN DE CADA REPORTE
  // ════════════════════════════════════════════════════════

  // ── COLUMNAS DE TABLA ─────────────────────────────────────
  const columnas = {
    'stock-critico': [
      { key: 'codigo',       label: 'Código'        },
      { key: 'nombre',       label: 'Producto'      },
      { key: 'stock_actual', label: 'Stock actual',  render: (v) => <span className={styles.valorRojo}>{v}</span> },
      { key: 'stock_minimo', label: 'Stock mínimo'  },
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
      { key: 'codigo',          label: 'Código'    },
      { key: 'nombre',          label: 'Producto'  },
      { key: 'stock_actual',    label: 'Stock',    render: (v, row) =>
          <span className={row.estado === 'critico' ? styles.valorRojo : styles.valorVerde}>{v}</span> },
      { key: 'precio',          label: 'Precio',   render: (v) => fmtP(v) },
      { key: 'valor_en_stock',  label: 'Valor total', render: (v) => <span className={styles.valorCyan}>{fmtP(v)}</span> },
      { key: 'estado',          label: 'Estado',   render: (v) =>
          <span className={v === 'critico' ? styles.badgeCritico : styles.badgeNormal}>
            {v === 'critico' ? '⚠ Crítico' : '✓ Normal'}
          </span> },
    ],
    'productos-baja': [
      { key: 'codigo',      label: 'Código'    },
      { key: 'nombre',      label: 'Producto'  },
      { key: 'precio',      label: 'Precio',   render: (v) => fmtP(v) },
      { key: 'stock_actual',label: 'Stock al dar de baja' },
      { key: 'updated_at',  label: 'Fecha de baja', render: (v) => fmtFecha(v) },
    ],
  }

  // ── GRÁFICOS ──────────────────────────────────────────────
  const renderGraficos = () => {
    if (!datos.length) return null

    // Paleta para resaltar la fila clickeada
    const colorBarra = (index, baseColor) =>
      filaResaltada === null || filaResaltada === index ? baseColor : 'rgba(200,228,244,0.12)'

    switch (reporteActivo) {

      // ── STOCK CRÍTICO: barra doble (actual vs mínimo) + barra de déficit ──
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

      // ── MÁS VENDIDOS: barra vertical + donut de participación ──
      case 'mas-vendidos': {
        const top10 = datos.slice(0, 10)
        const chartBar = top10.map((p, i) => ({
          name:   nombreCorto(p.nombre),
          ventas: p.total_salidas,
          index:  i,
        }))
        const chartPie = top10.map((p, i) => ({
          name:  nombreCorto(p.nombre, 14),
          value: p.total_salidas,
          index: i,
        }))
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
                  <Pie
                    data={chartPie} cx="50%" cy="45%"
                    innerRadius={55} outerRadius={100}
                    paddingAngle={2} dataKey="value"
                  >
                    {chartPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={filaResaltada === null || filaResaltada === i
                          ? COLORES_PIE[i % COLORES_PIE.length]
                          : 'rgba(200,228,244,0.08)'}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipCustom />} />
                  <Legend
                    formatter={(v) => <span style={{ color: C.textMid, fontSize: 11 }}>{v}</span>}
                    iconType="circle" iconSize={8}
                    wrapperStyle={{ paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      // ── MENOS VENDIDOS: barra horizontal + scatter stock vs ventas ──
      case 'menos-vendidos': {
        const top15 = datos.slice(0, 15)
        const chartBar = top15.map((p, i) => ({
          name:   nombreCorto(p.nombre),
          ventas: p.total_salidas,
          index:  i,
        }))
        const chartScatter = top15.map((p, i) => ({
          stock:  p.stock_actual,
          ventas: p.total_salidas,
          name:   p.nombre,
          index:  i,
        }))
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
                        opacity={filaResaltada === null || filaResaltada === i ? 1 : 0.3}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      // ── INVENTARIO ACTUAL: barra valor en stock + donut estado ──
      case 'inventario-actual': {
        const top12 = [...datos].sort((a, b) => b.valor_en_stock - a.valor_en_stock).slice(0, 12)
        const chartBar = top12.map((p, i) => ({
          name:  nombreCorto(p.nombre),
          valor: p.valor_en_stock,
          index: datos.indexOf(p),
        }))
        const criticos = datos.filter(p => p.estado === 'critico').length
        const normales  = datos.length - criticos
        const chartPie = [
          { name: 'Normal',  value: normales,  color: C.verde },
          { name: 'Crítico', value: criticos,  color: C.rojo  },
        ]
        const valorTotal = datos.reduce((s, p) => s + p.valor_en_stock, 0)
        return (
          <div className={styles.graficosWrap}>
            <div className={styles.graficoBloque}>
              <div className={styles.graficoTitulo}>Top 12 — capital inmovilizado en stock ($)</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartBar} layout="vertical" barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.dim} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.textMid, fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
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

      // ── PRODUCTOS BAJA: KPI cards + línea de bajas por mes ──
      case 'productos-baja': {
        // Agrupamos bajas por mes para el gráfico de línea
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
            <tr>
              {cols.map(c => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {datos.map((row, i) => (
              <tr
                key={i}
                className={`${filaResaltada === i ? styles.filaResaltada : ''}`}
                onClick={() => setFilaResaltada(filaResaltada === i ? null : i)}
                title="Clic para resaltar en el gráfico"
              >
                {cols.map(c => (
                  <td key={c.key} data-label={c.label}>
                    {c.render
                      ? c.render(row[c.key], row)
                      : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── REPORTE INFO ──────────────────────────────────────────
  const reporteInfo = REPORTES.find(r => r.id === reporteActivo)

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.contenido}>

        {/* ── HEADER ── */}
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

        {/* ── SELECTOR DE REPORTE ── */}
        <div className={styles.selectorReportes}>
          {REPORTES.map(r => (
            <button
              key={r.id}
              className={`${styles.selectorBtn} ${reporteActivo === r.id ? styles.selectorBtnActivo : ''}`}
              onClick={() => cambiarReporte(r.id)}
            >
              <span className={styles.selectorIcono}>{r.icono}</span>
              <span className={styles.selectorLabel}>{r.label}</span>
              <span className={styles.selectorDesc}>{r.desc}</span>
            </button>
          ))}
        </div>

        {/* ── FILTROS ── */}
        <div className={styles.filtrosPanel}>
          <div className={styles.filtrosTitulo}>Filtros</div>
          <div className={styles.filtrosGrid}>

            {/* Fechas — solo para reportes que las usan */}
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

            <div className={styles.filtroGrupo}>
              <label>Nombre</label>
              <input type="text" className={styles.filtroInput}
                placeholder="Buscar por nombre..."
                value={filtros.nombre}
                onChange={e => setFiltros({...filtros, nombre: e.target.value})} />
            </div>

            <div className={styles.filtroGrupo}>
              <label>Código</label>
              <input type="text" className={styles.filtroInput}
                placeholder="Ej: BUL-M10"
                value={filtros.codigo}
                onChange={e => setFiltros({...filtros, codigo: e.target.value})} />
            </div>

            <div className={styles.filtroGrupo}>
              <label>Categoría</label>
              <select className={styles.filtroInput}
                value={filtros.categoria_id}
                onChange={e => setFiltros({...filtros, categoria_id: e.target.value})}>
                <option value="">Todas</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className={styles.filtroAcciones}>
              <button className={styles.btnAplicar} onClick={() => ejecutarReporte()}>
                ▶ Generar reporte
              </button>
              <button className={styles.btnLimpiar} onClick={() => {
                setFiltros({ desde: '', hasta: '', nombre: '', codigo: '', categoria_id: '' })
              }}>
                ✕ Limpiar
              </button>
            </div>

          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className={styles.errorMsg}>
            <span className={styles.errorIcono}>⚠</span>
            {error}
          </div>
        )}

        {/* ── TOGGLE DE VISTA ── */}
        {!cargando && datos.length > 0 && (
          <div className={styles.vistaToggle}>
            <span className={styles.vistaLabel}>Vista:</span>
            {[
              { id: 'ambos',   label: '▦ Tabla + Gráficos' },
              { id: 'tabla',   label: '≡ Solo tabla'        },
              { id: 'grafico', label: '◉ Solo gráficos'     },
            ].map(v => (
              <button
                key={v.id}
                className={`${styles.vistaBtn} ${vista === v.id ? styles.vistaBtnActivo : ''}`}
                onClick={() => setVista(v.id)}
              >
                {v.label}
              </button>
            ))}
            <span className={styles.vistaHint}>
              Clic en una fila de la tabla para resaltar en el gráfico
            </span>
          </div>
        )}

        {/* ── CARGANDO ── */}
        {cargando && (
          <div className={styles.cargando}>
            <div className={styles.cargandoSpinner}></div>
            <span>Generando reporte...</span>
          </div>
        )}

        {/* ── CONTENIDO PRINCIPAL: TABLA + GRÁFICOS ── */}
        {!cargando && datos.length > 0 && (
          <div className={`${styles.mainGrid} ${styles['mainGrid_' + vista]}`}>

            {/* TABLA */}
            {(vista === 'ambos' || vista === 'tabla') && (
              <div className={styles.tablaPanel}>
                <div className={styles.tablaPanelHeader}>
                  <span className={styles.panelTitulo}>{reporteInfo?.label}</span>
                  <span className={styles.panelContador}>{datos.length} registros</span>
                </div>
                {renderTabla()}
              </div>
            )}

            {/* GRÁFICOS */}
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
