"""
pdf_reportes.py — Generador de PDFs para los 5 reportes con gráficos
Bulonera Miguel — A4 Portrait

Estructura de cada PDF:
  1. Encabezado empresa + título del reporte
  2. KPI cards
  3. Gráficos (matplotlib, 2 por reporte, lado a lado)
  4. Tabla de datos detallados
  5. Pie de página

Requiere: reportlab, matplotlib
"""

import io
from datetime import datetime

# ── matplotlib DEBE configurarse ANTES de importar pyplot ────────────────────
import matplotlib
matplotlib.use('Agg')            # backend sin pantalla — obligatorio en servidor
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, HRFlowable, Image,
)

# ─── Paleta ReportLab (print-optimized) ──────────────────────────────────────
AZUL_OSCURO  = HexColor("#1a2744")
AZUL_MEDIO   = HexColor("#0891b2")
AZUL_CLARO   = HexColor("#e0f2fe")
GRIS_CLARO   = HexColor("#f8fafc")
GRIS_BORDE   = HexColor("#e2e8f0")
GRIS_TEXTO   = HexColor("#64748b")
ROJO         = HexColor("#dc2626")
ROJO_BG      = HexColor("#fef2f2")
VERDE        = HexColor("#16a34a")
VERDE_BG     = HexColor("#f0fdf4")
AMARILLO     = HexColor("#d97706")
AMARILLO_BG  = HexColor("#fffbeb")

# ─── Paleta matplotlib (strings hex) ─────────────────────────────────────────
MC = {
    "azul":     "#1a2744",
    "cyan":     "#0891b2",
    "rojo":     "#dc2626",
    "verde":    "#16a34a",
    "amarillo": "#d97706",
    "gris_bg":  "#f8fafc",
    "gris_gr":  "#e2e8f0",
    "gris_txt": "#64748b",
    "lila":     "#7c3aed",
    "naranja":  "#ea580c",
}
PALETA_PIE = ["#0891b2","#16a34a","#d97706","#7c3aed","#dc2626",
              "#0e7490","#15803d","#b45309","#6d28d9","#b91c1c"]

EMPRESA = {
    "nombre":    "BULONERA MIGUEL S.R.L.",
    "cuit":      "20-18572102-8",
    "domicilio": "Av. Buchardo 2268, Posadas, Misiones",
    "telefono":  "0376 494-7546",
    "email":     "ventas@buloneramiguel.com.ar",
}

ANCHO = A4[0] - 30 * mm        # ~180mm ancho útil
CH_W  = (ANCHO / 2) - 2 * mm  # ancho de cada gráfico (dos columnas)
CH_H  = 62 * mm                # alto de cada gráfico


# ═══════════════════════════════════════════════════════════════════════════════
# DISPATCHER PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

def generar_pdf_reporte(reporte_id: str, datos: list, filtros: dict = None) -> bytes:
    filtros = filtros or {}
    gen = {
        "stock-critico":     _pdf_stock_critico,
        "mas-vendidos":      _pdf_mas_vendidos,
        "menos-vendidos":    _pdf_menos_vendidos,
        "inventario-actual": _pdf_inventario_actual,
        "productos-baja":    _pdf_productos_baja,
    }
    fn = gen.get(reporte_id)
    if not fn:
        raise ValueError(f"Reporte desconocido: {reporte_id}")
    return fn(datos, filtros)


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTE 1 — STOCK CRÍTICO
# ═══════════════════════════════════════════════════════════════════════════════

def _pdf_stock_critico(datos, filtros):
    buf = io.BytesIO()
    st  = _build_styles()
    doc = _make_doc(buf, "Stock Crítico")
    story = []

    total_def = sum(p["stock_minimo"] - p["stock_actual"] for p in datos)
    mayor_def = max((p["stock_minimo"] - p["stock_actual"] for p in datos), default=0)
    kpis = [
        ("Productos críticos",       str(len(datos)),    ROJO,     ROJO_BG),
        ("Total unidades faltantes", str(total_def),     AMARILLO, AMARILLO_BG),
        ("Mayor déficit individual", str(mayor_def),     ROJO,     ROJO_BG),
    ]

    story += _encabezado("Stock Crítico",
                         "Productos con stock por debajo del mínimo requerido",
                         "⚠", filtros, len(datos), st)
    story.append(Spacer(1, 4*mm))
    story.append(_kpi_row(kpis, st))
    story.append(Spacer(1, 4*mm))

    # ── Gráficos ──────────────────────────────────────────────────────────────
    top = datos[:12]
    nombres  = [_short(p["nombre"], 16) for p in top]
    actuales = [p["stock_actual"]  for p in top]
    minimos  = [p["stock_minimo"]  for p in top]
    deficits = [p["stock_minimo"] - p["stock_actual"] for p in top]

    g1 = _chart_barras_doble_h(
        nombres, actuales, minimos,
        "Stock actual", "Stock mínimo",
        MC["rojo"], "#f87171",
        "Stock actual vs mínimo requerido"
    )
    g2 = _chart_barras_v(
        nombres, deficits, MC["amarillo"],
        "Déficit por producto (unidades faltantes)"
    )
    story.append(_chart_row(g1, g2))
    story.append(Spacer(1, 4*mm))

    # ── Tabla ─────────────────────────────────────────────────────────────────
    story.append(_seccion_label("DATOS DETALLADOS", st))
    headers = ["Código", "Producto", "Stock\nActual", "Stock\nMínimo", "Déficit"]
    widths  = [_w(.12), _w(.42), _w(.15), _w(.15), _w(.16)]
    filas   = [_hr(headers, st)]
    for p in datos:
        deficit = p["stock_minimo"] - p["stock_actual"]
        filas.append([
            _c(p.get("codigo",""), st),
            _c(p.get("nombre",""), st),
            _c(str(p.get("stock_actual",0)), st, color=ROJO, bold=True),
            _c(str(p.get("stock_minimo",0)), st),
            _c(f"-{deficit}", st, color=ROJO, bold=True, align=TA_CENTER),
        ])
    story.append(_tabla(filas, widths, col_bg={4: ROJO_BG}))
    story += _pie(st)
    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTE 2 — MÁS VENDIDOS
# ═══════════════════════════════════════════════════════════════════════════════

def _pdf_mas_vendidos(datos, filtros):
    buf = io.BytesIO()
    st  = _build_styles()
    doc = _make_doc(buf, "Más Vendidos")
    story = []

    total_u = sum(p.get("total_salidas", 0) for p in datos)
    total_m = sum(p.get("cantidad_movimientos", 0) for p in datos)
    top1    = datos[0]["nombre"] if datos else "—"
    kpis = [
        ("Total unidades despachadas", _fmt_num(total_u), VERDE,      VERDE_BG),
        ("Total movimientos",          _fmt_num(total_m), AZUL_MEDIO, AZUL_CLARO),
        ("Producto líder",             _short(top1, 20),  VERDE,      VERDE_BG),
    ]

    story += _encabezado("Más Vendidos",
                         "Productos con mayor rotación de salidas en el período",
                         "↑", filtros, len(datos), st)
    story.append(Spacer(1, 4*mm))
    story.append(_kpi_row(kpis, st))
    story.append(Spacer(1, 4*mm))

    # ── Gráficos ──────────────────────────────────────────────────────────────
    top10 = datos[:10]
    nombres = [_short(p["nombre"], 14) for p in top10]
    ventas  = [p.get("total_salidas", 0) for p in top10]

    g1 = _chart_barras_v(nombres, ventas, MC["verde"], "Top 10 — unidades despachadas")
    g2 = _chart_donut(nombres, ventas, PALETA_PIE, "Participación en ventas (%)")
    story.append(_chart_row(g1, g2))
    story.append(Spacer(1, 4*mm))

    story.append(_seccion_label("DATOS DETALLADOS", st))
    headers = ["#", "Código", "Producto", "Unidades\nVendidas", "Movimientos", "Precio Unit."]
    widths  = [_w(.05), _w(.12), _w(.38), _w(.17), _w(.14), _w(.14)]
    filas   = [_hr(headers, st)]
    for i, p in enumerate(datos):
        filas.append([
            _c(str(i+1), st, align=TA_CENTER),
            _c(p.get("codigo",""), st),
            _c(p.get("nombre",""), st),
            _c(_fmt_num(p.get("total_salidas",0)), st, color=VERDE, bold=True, align=TA_CENTER),
            _c(_fmt_num(p.get("cantidad_movimientos",0)), st, align=TA_CENTER),
            _c(_fmt_moneda(p.get("precio",0)), st, align=TA_RIGHT),
        ])
    story.append(_tabla(filas, widths))
    story += _pie(st)
    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTE 3 — MENOS VENDIDOS
# ═══════════════════════════════════════════════════════════════════════════════

def _pdf_menos_vendidos(datos, filtros):
    buf = io.BytesIO()
    st  = _build_styles()
    doc = _make_doc(buf, "Menos Vendidos")
    story = []

    sin_mov     = sum(1 for p in datos if p.get("total_salidas", 0) == 0)
    stock_inmov = sum(
        float(p.get("precio", 0)) * p.get("stock_actual", 0)
        for p in datos if p.get("total_salidas", 0) == 0
    )
    kpis = [
        ("Productos sin movimiento",         str(sin_mov),               AMARILLO, AMARILLO_BG),
        ("Capital inmovilizado (sin mov.)",  _fmt_moneda(stock_inmov),   ROJO,     ROJO_BG),
        ("Total en reporte",                 str(len(datos)),             GRIS_TEXTO, GRIS_CLARO),
    ]

    story += _encabezado("Menos Vendidos",
                         "Productos con menor rotación — posible stock inmovilizado",
                         "↓", filtros, len(datos), st)
    story.append(Spacer(1, 4*mm))
    story.append(_kpi_row(kpis, st))
    story.append(Spacer(1, 4*mm))

    # ── Gráficos ──────────────────────────────────────────────────────────────
    top15 = datos[:12]
    nombres = [_short(p["nombre"], 16) for p in top15]
    ventas  = [p.get("total_salidas", 0) for p in top15]
    stocks  = [p.get("stock_actual", 0) for p in top15]

    g1 = _chart_barras_h(nombres, ventas, MC["amarillo"],
                         "Unidades despachadas (menor a mayor)")
    g2 = _chart_scatter(ventas, stocks, MC["amarillo"],
                        "Stock disponible vs ventas\n(arriba-izq = alto stock, pocas ventas)")
    story.append(_chart_row(g1, g2))
    story.append(Spacer(1, 4*mm))

    story.append(_seccion_label("DATOS DETALLADOS", st))
    headers = ["#", "Código", "Producto", "Unidades\nVendidas", "Stock\nActual", "Precio Unit."]
    widths  = [_w(.05), _w(.12), _w(.38), _w(.17), _w(.14), _w(.14)]
    filas   = [_hr(headers, st)]
    for i, p in enumerate(datos):
        sal = p.get("total_salidas", 0)
        filas.append([
            _c(str(i+1), st, align=TA_CENTER),
            _c(p.get("codigo",""), st),
            _c(p.get("nombre",""), st),
            _c(_fmt_num(sal), st,
               color=ROJO if sal == 0 else AMARILLO, bold=True, align=TA_CENTER),
            _c(_fmt_num(p.get("stock_actual",0)), st, align=TA_CENTER),
            _c(_fmt_moneda(p.get("precio",0)), st, align=TA_RIGHT),
        ])
    story.append(_tabla(filas, widths))
    story += _pie(st)
    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTE 4 — INVENTARIO ACTUAL
# ═══════════════════════════════════════════════════════════════════════════════

def _pdf_inventario_actual(datos, filtros):
    buf = io.BytesIO()
    st  = _build_styles()
    doc = _make_doc(buf, "Inventario Actual")
    story = []

    valor_total = sum(p.get("valor_en_stock", 0) for p in datos)
    criticos    = sum(1 for p in datos if p.get("estado") == "critico")
    normales    = len(datos) - criticos
    kpis = [
        ("Valor total en stock",          _fmt_moneda(valor_total), AZUL_MEDIO, AZUL_CLARO),
        ("Productos estado normal",        str(normales),            VERDE,      VERDE_BG),
        ("Productos estado crítico",       str(criticos),            ROJO,       ROJO_BG),
    ]

    story += _encabezado("Inventario Actual",
                         "Estado del stock en tiempo real — todos los productos activos",
                         "▦", filtros, len(datos), st)
    story.append(Spacer(1, 4*mm))
    story.append(_kpi_row(kpis, st))
    story.append(Spacer(1, 4*mm))

    # ── Gráficos ──────────────────────────────────────────────────────────────
    top12 = sorted(datos, key=lambda p: p.get("valor_en_stock", 0), reverse=True)[:12]
    nombres = [_short(p["nombre"], 16) for p in top12]
    valores = [p.get("valor_en_stock", 0) for p in top12]

    g1 = _chart_barras_h(nombres, valores, MC["cyan"],
                         "Top 12 — capital inmovilizado en stock ($)",
                         fmt_k=True)
    g2 = _chart_donut(
        ["Normal", "Crítico"],
        [normales, criticos],
        [MC["verde"], MC["rojo"]],
        f"Estado del inventario\n({len(datos)} productos totales)"
    )
    story.append(_chart_row(g1, g2))
    story.append(Spacer(1, 4*mm))

    story.append(_seccion_label("DATOS DETALLADOS", st))
    headers = ["Código", "Producto", "Stock", "Precio", "Valor en\nStock", "Estado"]
    widths  = [_w(.12), _w(.35), _w(.10), _w(.14), _w(.16), _w(.13)]
    filas   = [_hr(headers, st)]
    for p in datos:
        es_crit = p.get("estado") == "critico"
        filas.append([
            _c(p.get("codigo",""), st),
            _c(p.get("nombre",""), st),
            _c(str(p.get("stock_actual",0)), st,
               color=ROJO if es_crit else VERDE, bold=True, align=TA_CENTER),
            _c(_fmt_moneda(p.get("precio",0)), st, align=TA_RIGHT),
            _c(_fmt_moneda(p.get("valor_en_stock",0)), st,
               color=AZUL_MEDIO, bold=True, align=TA_RIGHT),
            _c("⚠ Crítico" if es_crit else "✓ Normal", st,
               color=ROJO if es_crit else VERDE, bold=True, align=TA_CENTER),
        ])
    # Fila de total
    filas.append([
        _c("", st), _c("TOTAL VALOR EN STOCK", st, bold=True),
        _c("", st), _c("", st),
        _c(_fmt_moneda(valor_total), st, color=AZUL_MEDIO, bold=True, align=TA_RIGHT),
        _c("", st),
    ])
    story.append(_tabla(filas, widths, fila_total=True))
    story += _pie(st)
    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTE 5 — PRODUCTOS DE BAJA
# ═══════════════════════════════════════════════════════════════════════════════

def _pdf_productos_baja(datos, filtros):
    buf = io.BytesIO()
    st  = _build_styles()
    doc = _make_doc(buf, "Productos de Baja")
    story = []

    val_perdido = sum(
        float(p.get("precio",0)) * p.get("stock_actual",0) for p in datos
    )
    kpis = [
        ("Total productos dados de baja",      str(len(datos)),          ROJO,     ROJO_BG),
        ("Stock inmovilizado al dar de baja",  _fmt_moneda(val_perdido), AMARILLO, AMARILLO_BG),
    ]

    story += _encabezado("Productos de Baja",
                         "Productos desactivados del sistema en el período seleccionado",
                         "✕", filtros, len(datos), st)
    story.append(Spacer(1, 4*mm))
    story.append(_kpi_row(kpis, st, cols=2))
    story.append(Spacer(1, 4*mm))

    # ── Gráficos ──────────────────────────────────────────────────────────────
    # Bajas por mes
    bajas_mes = {}
    for p in datos:
        raw = p.get("updated_at","")
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z","+00:00"))
            mes = dt.strftime("%b %y")
        except Exception:
            mes = "Sin fecha"
        bajas_mes[mes] = bajas_mes.get(mes, 0) + 1

    meses    = list(bajas_mes.keys())
    cantidad = list(bajas_mes.values())

    # Valores de precio de los productos dados de baja (para scatter)
    precios  = [float(p.get("precio",0))      for p in datos]
    stocks_b = [p.get("stock_actual",0)        for p in datos]

    g1 = _chart_linea(meses, cantidad, MC["rojo"], "Bajas registradas por mes")
    g2 = _chart_scatter(precios, stocks_b, MC["amarillo"],
                        "Precio vs stock al dar de baja",
                        xlabel="Precio ($)", ylabel="Stock")
    story.append(_chart_row(g1, g2))
    story.append(Spacer(1, 4*mm))

    story.append(_seccion_label("DATOS DETALLADOS", st))
    headers = ["Código", "Producto", "Precio", "Stock al dar\nde baja", "Fecha de Baja"]
    widths  = [_w(.13), _w(.42), _w(.15), _w(.17), _w(.13)]
    filas   = [_hr(headers, st)]
    for p in datos:
        filas.append([
            _c(p.get("codigo",""), st),
            _c(p.get("nombre",""), st),
            _c(_fmt_moneda(p.get("precio",0)), st, align=TA_RIGHT),
            _c(str(p.get("stock_actual",0)), st, align=TA_CENTER),
            _c(_fmt_fecha(p.get("updated_at","")), st, align=TA_CENTER),
        ])
    story.append(_tabla(filas, widths))
    story += _pie(st)
    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════════
# GENERADORES DE GRÁFICOS (matplotlib → BytesIO PNG)
# ═══════════════════════════════════════════════════════════════════════════════

def _fig_base(titulo: str):
    """Crea figura matplotlib con estilo del sistema."""
    fig, ax = plt.subplots(figsize=(CH_W / mm * 0.0394 * 25.4 / 25.4,
                                    CH_H  / mm * 0.0394 * 25.4 / 25.4))
    # figsize en pulgadas
    # tamaño corregido
    fig.patch.set_facecolor("white")
    ax.set_facecolor(MC["gris_bg"])
    ax.set_title(titulo, fontsize=7.5, color=MC["azul"], fontweight="bold",
                 pad=6, loc="left")
    ax.tick_params(colors=MC["gris_txt"], labelsize=6.5)
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    for spine in ["bottom", "left"]:
        ax.spines[spine].set_color(MC["gris_gr"])
    ax.grid(color=MC["gris_gr"], linewidth=0.5, linestyle="--", alpha=0.8)
    return fig, ax


def _fig_to_buf(fig) -> io.BytesIO:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight",
                facecolor="white", edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    return buf


def _chart_barras_v(nombres, valores, color, titulo) -> io.BytesIO:
    """Barras verticales."""
    fig, ax = _fig_base(titulo)
    x = range(len(nombres))
    bars = ax.bar(x, valores, color=color, alpha=0.85, width=0.6, zorder=3)
    ax.set_xticks(list(x))
    ax.set_xticklabels(nombres, rotation=35, ha="right", fontsize=6)
    # Etiquetas encima de cada barra
    for bar, val in zip(bars, valores):
        if val > 0:
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(valores)*0.01,
                    str(int(val)), ha="center", va="bottom",
                    fontsize=6, color=color, fontweight="bold")
    ax.set_axisbelow(True)
    fig.tight_layout()
    return _fig_to_buf(fig)


def _chart_barras_h(nombres, valores, color, titulo, fmt_k=False) -> io.BytesIO:
    """Barras horizontales."""
    fig, ax = _fig_base(titulo)
    y = range(len(nombres))
    bars = ax.barh(list(y), valores, color=color, alpha=0.85, height=0.6, zorder=3)
    ax.set_yticks(list(y))
    ax.set_yticklabels(nombres, fontsize=6)
    ax.invert_yaxis()
    # Etiquetas al final de cada barra
    for bar, val in zip(bars, valores):
        lbl = f"${val/1000:.0f}k" if fmt_k and val >= 1000 else str(int(val))
        ax.text(bar.get_width() + max(valores)*0.01, bar.get_y() + bar.get_height()/2,
                lbl, va="center", fontsize=6, color=color, fontweight="bold")
    ax.set_axisbelow(True)
    if fmt_k:
        ax.xaxis.set_major_formatter(
            matplotlib.ticker.FuncFormatter(lambda v, _: f"${v/1000:.0f}k"))
    fig.tight_layout()
    return _fig_to_buf(fig)


def _chart_barras_doble_h(nombres, vals1, vals2, lbl1, lbl2,
                           color1, color2, titulo) -> io.BytesIO:
    """Barras horizontales dobles (actual vs mínimo)."""
    fig, ax = _fig_base(titulo)
    y   = np.arange(len(nombres))
    h   = 0.35
    ax.barh(y + h/2, vals1, height=h, color=color1, alpha=0.85, label=lbl1, zorder=3)
    ax.barh(y - h/2, vals2, height=h, color=color2, alpha=0.85, label=lbl2, zorder=3)
    ax.set_yticks(y)
    ax.set_yticklabels(nombres, fontsize=6)
    ax.invert_yaxis()
    ax.legend(fontsize=6, loc="lower right",
              framealpha=0.8, edgecolor=MC["gris_gr"])
    ax.set_axisbelow(True)
    fig.tight_layout()
    return _fig_to_buf(fig)


def _chart_donut(nombres, valores, colores, titulo) -> io.BytesIO:
    """Gráfico donut."""
    fig, ax = plt.subplots(figsize=(CH_W / mm / 25.4 * 25.4,
                                     CH_H / mm / 25.4 * 25.4))
    fig.patch.set_facecolor("white")
    ax.set_title(titulo, fontsize=7.5, color=MC["azul"], fontweight="bold",
                 pad=6, loc="left")

    total = sum(valores) or 1
    wedges, texts, autotexts = ax.pie(
        valores,
        labels=None,
        colors=colores[:len(valores)],
        autopct=lambda p: f"{p:.1f}%" if p > 3 else "",
        startangle=90,
        wedgeprops=dict(width=0.55, edgecolor="white", linewidth=1.5),
        pctdistance=0.75,
    )
    for at in autotexts:
        at.set_fontsize(6.5)
        at.set_color("white")
        at.set_fontweight("bold")

    # Leyenda compacta
    leyenda = [mpatches.Patch(color=colores[i % len(colores)], label=f"{n} ({v})")
               for i, (n, v) in enumerate(zip(nombres, valores))]
    ax.legend(handles=leyenda, fontsize=6, loc="lower center",
              bbox_to_anchor=(0.5, -0.18), ncol=2,
              framealpha=0.8, edgecolor=MC["gris_gr"])
    fig.tight_layout()
    return _fig_to_buf(fig)


def _chart_scatter(x_vals, y_vals, color, titulo,
                   xlabel="Ventas", ylabel="Stock") -> io.BytesIO:
    """Scatter plot."""
    fig, ax = _fig_base(titulo)
    ax.scatter(x_vals, y_vals, color=color, alpha=0.7, s=30, zorder=3,
               edgecolors="white", linewidths=0.5)
    ax.set_xlabel(xlabel, fontsize=6, color=MC["gris_txt"])
    ax.set_ylabel(ylabel, fontsize=6, color=MC["gris_txt"])
    ax.set_axisbelow(True)
    fig.tight_layout()
    return _fig_to_buf(fig)


def _chart_linea(x_vals, y_vals, color, titulo) -> io.BytesIO:
    """Gráfico de línea."""
    fig, ax = _fig_base(titulo)
    if len(x_vals) > 1:
        ax.plot(x_vals, y_vals, color=color, linewidth=2,
                marker="o", markersize=5, markerfacecolor=color,
                markeredgecolor="white", markeredgewidth=1, zorder=3)
        ax.fill_between(range(len(x_vals)), y_vals,
                        alpha=0.1, color=color)
        ax.set_xticks(range(len(x_vals)))
        ax.set_xticklabels(x_vals, rotation=30, ha="right", fontsize=6)
        ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(integer=True))
        # Etiquetas sobre cada punto
        for i, (xi, yi) in enumerate(zip(range(len(x_vals)), y_vals)):
            ax.annotate(str(yi), (xi, yi), textcoords="offset points",
                        xytext=(0, 6), ha="center", fontsize=6,
                        color=color, fontweight="bold")
    else:
        # Un solo mes — mostrar como barra
        ax.bar(x_vals, y_vals, color=color, alpha=0.85, width=0.4, zorder=3)
    ax.set_axisbelow(True)
    fig.tight_layout()
    return _fig_to_buf(fig)


def _chart_row(buf1: io.BytesIO, buf2: io.BytesIO) -> Table:
    """Tabla de 2 columnas con los dos gráficos lado a lado."""
    img1 = Image(buf1, width=CH_W, height=CH_H)
    img2 = Image(buf2, width=CH_W, height=CH_H)
    tabla = Table([[img1, img2]], colWidths=[CH_W + 2*mm, CH_W + 2*mm])
    tabla.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))
    return tabla


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS DE CONSTRUCCIÓN DE STORY
# ═══════════════════════════════════════════════════════════════════════════════

def _make_doc(buffer, titulo):
    return SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=18*mm, bottomMargin=18*mm,
        title=titulo, author=EMPRESA["nombre"],
    )

def _w(pct): return ANCHO * pct

def _encabezado(titulo, subtitulo, icono, filtros, total, st):
    ahora = datetime.now().strftime("%d/%m/%Y %H:%M")
    story = []
    emp = Table([[
        Paragraph(EMPRESA["nombre"], st["empresa_nombre"]),
        Paragraph(
            f"{EMPRESA['domicilio']} · Tel: {EMPRESA['telefono']}<br/>"
            f"CUIT: {EMPRESA['cuit']} · {EMPRESA['email']}",
            st["empresa_sub"],
        ),
    ]], colWidths=[ANCHO*0.45, ANCHO*0.55])
    emp.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), AZUL_OSCURO),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LEFTPADDING",   (0,0),(-1,-1), 12),
        ("RIGHTPADDING",  (0,0),(-1,-1), 12),
    ]))
    story.append(emp)
    story.append(Spacer(1, 3*mm))

    tit = Table([[
        Paragraph(f"{icono}  {titulo.upper()}", st["reporte_titulo"]),
        Paragraph(
            f"<font color='#{_hex(GRIS_TEXTO)}'>Generado: {ahora} · {total} registros</font>",
            st["reporte_meta"],
        ),
    ]], colWidths=[ANCHO*0.65, ANCHO*0.35])
    tit.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), AZUL_CLARO),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 12),
        ("RIGHTPADDING",  (0,0),(-1,-1), 12),
        ("BOX",           (0,0),(-1,-1), 0.5, GRIS_BORDE),
    ]))
    story.append(tit)
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(subtitulo, st["reporte_subtitulo"]))
    filtros_txt = _describir_filtros(filtros)
    if filtros_txt:
        story.append(Spacer(1, 1*mm))
        story.append(Paragraph(f"<b>Filtros:</b> {filtros_txt}", st["filtros_texto"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRIS_BORDE))
    return story

def _kpi_row(kpis, st, cols=3):
    celdas = []
    for label, valor, color_texto, color_fondo in kpis:
        celdas.append([
            Paragraph(label, st["kpi_label"]),
            Paragraph(valor, ParagraphStyle("kv", fontSize=15,
                fontName="Helvetica-Bold", textColor=color_texto,
                alignment=TA_CENTER, leading=18)),
        ])
    tabla = Table([celdas], colWidths=[ANCHO/cols]*cols)
    ts = [
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("ALIGN",         (0,0),(-1,-1), "CENTER"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 5),
        ("RIGHTPADDING",  (0,0),(-1,-1), 5),
        ("BOX",           (0,0),(-1,-1), 0.5, GRIS_BORDE),
        ("INNERGRID",     (0,0),(-1,-1), 0.5, GRIS_BORDE),
    ]
    for j, (_, _, _, cf) in enumerate(kpis):
        ts.append(("BACKGROUND", (j,0), (j,0), cf))
    tabla.setStyle(TableStyle(ts))
    return tabla

def _seccion_label(texto, st):
    return Paragraph(
        f"<font color='#{_hex(AZUL_OSCURO)}'><b>{texto}</b></font>",
        ParagraphStyle("sl", fontSize=8, fontName="Helvetica-Bold",
                       textColor=AZUL_OSCURO, spaceBefore=2, spaceAfter=3)
    )

def _hr(headers, st):
    return [Paragraph(h, st["th"]) for h in headers]

def _c(texto, st, color=None, bold=False, align=TA_LEFT):
    nombre = "celda"
    if color == ROJO:     nombre = "celda_rojo"
    elif color == VERDE:  nombre = "celda_verde"
    elif color == AMARILLO: nombre = "celda_amarillo"
    elif color == AZUL_MEDIO: nombre = "celda_cyan"
    elif color == GRIS_TEXTO: nombre = "celda_gris"
    else:
        nombre = "celda"

    base = st[nombre]
    if align != TA_LEFT or bold:
        base = ParagraphStyle(
            "dyn",
            parent=base,
            alignment=align,
            fontName="Helvetica-Bold" if bold else base.fontName,
        )
    return Paragraph(str(texto), base)

def _tabla(filas, widths, col_bg=None, fila_total=False):
    t = Table(filas, colWidths=widths, repeatRows=1)
    ts = [
        ("BACKGROUND",    (0,0),(-1,0), AZUL_OSCURO),
        ("TEXTCOLOR",     (0,0),(-1,0), white),
        ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,0), 8),
        ("ALIGN",         (0,0),(-1,0), "CENTER"),
        ("VALIGN",        (0,0),(-1,0), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,0), 6),
        ("BOTTOMPADDING", (0,0),(-1,0), 6),
        ("ROWBACKGROUNDS",(0,1),(-1,-1 if not fila_total else -2), [white, GRIS_CLARO]),
        ("GRID",          (0,0),(-1,-1), 0.3, GRIS_BORDE),
        ("BOX",           (0,0),(-1,-1), 0.8, AZUL_MEDIO),
        ("TOPPADDING",    (0,1),(-1,-1), 4),
        ("BOTTOMPADDING", (0,1),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 5),
        ("RIGHTPADDING",  (0,0),(-1,-1), 5),
        ("VALIGN",        (0,1),(-1,-1), "MIDDLE"),
    ]
    if col_bg:
        for col_idx, bg_color in col_bg.items():
            ts.append(("BACKGROUND", (col_idx,1), (col_idx,-1), bg_color))
    if fila_total:
        ts += [
            ("BACKGROUND",  (0,-1),(-1,-1), AZUL_CLARO),
            ("FONTNAME",    (0,-1),(-1,-1), "Helvetica-Bold"),
            ("LINEABOVE",   (0,-1),(-1,-1), 1.5, AZUL_MEDIO),
        ]
    t.setStyle(TableStyle(ts))
    return t

def _pie(st):
    return [
        Spacer(1, 5*mm),
        HRFlowable(width="100%", thickness=0.5, color=GRIS_BORDE),
        Spacer(1, 2*mm),
        Paragraph(
            f"Reporte generado por el Sistema de Gestión Bulonera Miguel · "
            f"{EMPRESA['nombre']} · CUIT {EMPRESA['cuit']} · "
            f"Información confidencial de uso interno.",
            st["pie"],
        ),
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# ESTILOS REPORTLAB
# ═══════════════════════════════════════════════════════════════════════════════

def _build_styles():
    s = {}
    def add(name, **kw): s[name] = ParagraphStyle(name, **kw)
    add("empresa_nombre", fontSize=13, fontName="Helvetica-Bold", textColor=white, leading=16)
    add("empresa_sub",    fontSize=7.5, textColor=HexColor("#93c5fd"), leading=10)
    add("reporte_titulo", fontSize=15, fontName="Helvetica-Bold", textColor=AZUL_OSCURO, leading=18)
    add("reporte_subtitulo", fontSize=8.5, textColor=GRIS_TEXTO, leading=11)
    add("reporte_meta",   fontSize=8, textColor=GRIS_TEXTO, alignment=TA_RIGHT, leading=10)
    add("filtros_texto",  fontSize=8, textColor=GRIS_TEXTO, leading=10)
    add("kpi_label",      fontSize=7.5, fontName="Helvetica-Bold", textColor=GRIS_TEXTO,
        alignment=TA_CENTER, leading=10)
    add("th",             fontSize=8, fontName="Helvetica-Bold", textColor=white,
        alignment=TA_CENTER, leading=10)
    add("celda",          fontSize=8, textColor=black, leading=10)
    add("celda_rojo",     fontSize=8, textColor=ROJO,       fontName="Helvetica-Bold", leading=10)
    add("celda_verde",    fontSize=8, textColor=VERDE,      fontName="Helvetica-Bold", leading=10)
    add("celda_amarillo", fontSize=8, textColor=AMARILLO,   fontName="Helvetica-Bold", leading=10)
    add("celda_cyan",     fontSize=8, textColor=AZUL_MEDIO, fontName="Helvetica-Bold", leading=10)
    add("celda_gris",     fontSize=8, textColor=GRIS_TEXTO, leading=10)
    add("pie",            fontSize=6.5, textColor=GRIS_TEXTO, alignment=TA_CENTER, leading=9)
    return s


# ═══════════════════════════════════════════════════════════════════════════════
# UTILIDADES
# ═══════════════════════════════════════════════════════════════════════════════

def _fmt_moneda(v):
    try: return f"$ {float(v):,.2f}".replace(",","X").replace(".",",").replace("X",".")
    except: return "$ 0,00"

def _fmt_num(v):
    try: return f"{int(v):,}".replace(",",".")
    except: return "0"

def _fmt_fecha(v):
    if not v: return "—"
    try:
        dt = datetime.fromisoformat(str(v).replace("Z","+00:00"))
        return dt.strftime("%d/%m/%Y")
    except: return str(v)[:10]

def _short(texto, n=16):
    if not texto: return "—"
    return texto[:n]+"…" if len(texto) > n else texto

def _describir_filtros(f):
    partes = []
    if f.get("desde"):        partes.append(f"Desde: {f['desde']}")
    if f.get("hasta"):        partes.append(f"Hasta: {f['hasta']}")
    if f.get("nombre"):       partes.append(f"Nombre: {f['nombre']}")
    if f.get("codigo"):       partes.append(f"Código: {f['codigo']}")
    if f.get("categoria_id"): partes.append(f"Categoría: {f['categoria_id']}")
    return " · ".join(partes)

def _hex(color):
    try:
        return f"{int(color.red*255):02x}{int(color.green*255):02x}{int(color.blue*255):02x}"
    except: return "64748b"


# ── TEST RÁPIDO (python pdf_reportes.py) ─────────────────────────────────────
if __name__ == "__main__":
    datos_test = [
        {"codigo":"BUL-M8","nombre":"Bulón hexagonal M8 x 30mm","stock_actual":2,"stock_minimo":20,"precio":125.50,"stock_en_stock":251,"valor_en_stock":251,"estado":"critico","total_salidas":45,"cantidad_movimientos":8,"updated_at":"2025-03-01"},
        {"codigo":"TCA-M10","nombre":"Tuerca M10 zincada caja 100u","stock_actual":5,"stock_minimo":15,"precio":480.00,"valor_en_stock":2400,"estado":"critico","total_salidas":30,"cantidad_movimientos":5,"updated_at":"2025-04-01"},
        {"codigo":"ARD-M6","nombre":"Arandela plana M6 bolsa 200u","stock_actual":0,"stock_minimo":10,"precio":320.00,"valor_en_stock":0,"estado":"critico","total_salidas":10,"cantidad_movimientos":3,"updated_at":"2025-02-01"},
    ]
    for rid in ["stock-critico","mas-vendidos","menos-vendidos","inventario-actual","productos-baja"]:
        pdf = generar_pdf_reporte(rid, datos_test, {})
        fname = f"test_{rid}.pdf"
        with open(fname,"wb") as f: f.write(pdf)
        print(f"✅ {fname} ({len(pdf):,} bytes)")
