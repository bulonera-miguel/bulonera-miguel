"""
pdf_presupuesto.py — Generador de PDF de Presupuesto
Bulonera Miguel — Formato A4

Genera un presupuesto con logo, datos de la empresa,
detalle de productos y validez del presupuesto.
"""

import io
import os
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, HRFlowable, Image,
)

# ─── Paleta ───────────────────────────────────────────────────────────────────
AZUL_OSCURO  = HexColor("#1a2744")
AZUL_MEDIO   = HexColor("#2563eb")
AZUL_CLARO   = HexColor("#dbeafe")
AMARILLO     = HexColor("#d97706")
AMARILLO_BG  = HexColor("#fffbeb")
AMARILLO_BRD = HexColor("#fcd34d")
GRIS_CLARO   = HexColor("#f8fafc")
GRIS_BORDE   = HexColor("#cbd5e1")
GRIS_TEXTO   = HexColor("#475569")

# ─── Datos empresa ────────────────────────────────────────────────────────────
EMPRESA = {
    "nombre":             "BULONERA MIGUEL S.R.L.",
    "domicilio":          "Av. Buchardo 2268, Posadas, Misiones",
    "telefono":           "3764-236105",
    "email":              "bulonera.miguel@gmail.com",
    "cuit":               "20-18572102-8",
    "iibb":               "20185721028",
    "inicio_actividades": "01/01/2025",
    "condicion_iva":      "Responsable Inscripto",
}

ANCHO = A4[0] - 30 * mm
VALIDEZ_DIAS = 15


# ─── Función principal ────────────────────────────────────────────────────────

def generar_pdf_presupuesto(presupuesto: dict) -> bytes:
    """
    Genera PDF imprimible de un presupuesto.

    Parámetro `presupuesto` (dict):
      - numero:        str   → "PRES-XXXXXXXX"
      - fecha:         str   → "2026-06-25"
      - cliente:       dict  → {nombre, cuit}
      - items:         list  → [{nombre, codigo, cantidad, precio_unitario, subtotal}]
      - total:         float
      - observaciones: str (opcional)
      - validez_dias:  int (opcional, default 15)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=20*mm, bottomMargin=20*mm,
        title=f"Presupuesto {presupuesto.get('numero', '')}",
        author=EMPRESA["nombre"],
    )
    st    = _build_styles()
    story = []

    # 1. Encabezado
    story.append(_encabezado(presupuesto, st))
    story.append(Spacer(1, 6*mm))

    # 2. Datos cliente
    story.append(_bloque_cliente(presupuesto, st))
    story.append(Spacer(1, 6*mm))

    # 3. Tabla items
    story.append(_tabla_items(presupuesto, st))
    story.append(Spacer(1, 4*mm))

    # 4. Total
    story.append(_tabla_total(presupuesto, st))
    story.append(Spacer(1, 6*mm))

    # 5. Bloque validez
    story.append(_bloque_validez(presupuesto, st))
    story.append(Spacer(1, 4*mm))

    # 6. Observaciones
    obs = (presupuesto.get("observaciones") or "").strip()
    if obs:
        story.append(Paragraph("<b>Observaciones:</b>", st["label"]))
        story.append(Paragraph(obs, st["body"]))
        story.append(Spacer(1, 4*mm))

    # 7. Pie
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRIS_BORDE))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Este documento es un presupuesto y no tiene validez fiscal. "
        "Los precios están sujetos a cambio sin previo aviso. "
        f"{EMPRESA['nombre']} — CUIT {EMPRESA['cuit']} — {EMPRESA['condicion_iva']} ante el IVA.",
        st["pie"],
    ))

    doc.build(story)
    return buffer.getvalue()


# ─── Secciones ────────────────────────────────────────────────────────────────

def _encabezado(presupuesto: dict, st: dict) -> Table:
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo-bm-pdf.png")
    col_izq = []
    if os.path.exists(logo_path):
        from PIL import Image as PILImage
        with PILImage.open(logo_path) as img:
            w_px, h_px = img.size
            ancho_logo = 55*mm
            alto_logo  = ancho_logo * (h_px / w_px)
        col_izq.append(Image(logo_path, width=ancho_logo, height=alto_logo))
        col_izq.append(Spacer(1, 2*mm))
    col_izq += [
        Paragraph(EMPRESA["domicilio"], st["emp_sub"]),
        Paragraph(f"Tel: {EMPRESA['telefono']}", st["emp_sub"]),
        Paragraph(f"Email: {EMPRESA['email']}", st["emp_sub"]),
    ]

    numero = presupuesto.get("numero", "")
    fecha  = _fmt_fecha(presupuesto.get("fecha", ""))
    col_der = [
        Paragraph("<font size='7'>PRESUPUESTO</font>", st["right_small"]),
        Paragraph(f"<b>{numero}</b>", st["right_nro"]),
        Spacer(1, 3*mm),
        Paragraph("<font size='7'>Fecha</font>", st["right_small"]),
        Paragraph(f"<b>{fecha}</b>", st["right_fecha"]),
        Spacer(1, 3*mm),
        Paragraph(f"<font size='7'>CUIT: {EMPRESA['cuit']}</font>", st["right_small"]),
        Paragraph(f"<font size='7'>IIBB: {EMPRESA['iibb']}</font>", st["right_small"]),
        Paragraph(f"<font size='7'>Inicio act.: {EMPRESA['inicio_actividades']}</font>", st["right_small"]),
        Paragraph(f"<font size='7'>{EMPRESA['condicion_iva']}</font>", st["right_small"]),
    ]

    tabla = Table(
        [[col_izq, col_der]],
        colWidths=[ANCHO * 0.55, ANCHO * 0.45],
    )
    tabla.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("BACKGROUND",   (0,0), (-1,-1), AMARILLO_BG),
        ("BOX",          (0,0), (-1,-1), 1, AMARILLO_BRD),
        ("LINEAFTER",    (0,0), (0,0), 0.5, AMARILLO_BRD),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0), (-1,-1), 8),
        ("LEFTPADDING",  (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("ALIGN",        (1,0), (1,0), "RIGHT"),
    ]))
    return tabla


def _bloque_cliente(presupuesto: dict, st: dict) -> Table:
    cliente = presupuesto.get("cliente") or {}
    nombre  = cliente.get("nombre") or "Sin especificar"
    cuit    = cliente.get("cuit") or "—"

    filas = [
        [Paragraph("DATOS DEL CLIENTE", st["section_title"]),
         Paragraph("", st["body"])],
        [Paragraph("Nombre / Razón Social:", st["label"]),
         Paragraph(nombre, st["body"])],
        [Paragraph("CUIT:", st["label"]),
         Paragraph(cuit, st["body"])],
    ]
    tabla = Table(filas, colWidths=[ANCHO * 0.35, ANCHO * 0.65])
    tabla.setStyle(TableStyle([
        ("SPAN",         (0,0), (1,0)),
        ("BACKGROUND",   (0,0), (1,0), AZUL_CLARO),
        ("TEXTCOLOR",    (0,0), (1,0), AZUL_OSCURO),
        ("BOX",          (0,0), (-1,-1), 0.5, GRIS_BORDE),
        ("GRID",         (0,1), (-1,-1), 0.3, GRIS_BORDE),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
    ]))
    return tabla


def _tabla_items(presupuesto: dict, st: dict) -> Table:
    items   = presupuesto.get("items") or []
    headers = ["#", "Código", "Producto", "Cant.", "Precio Unit.", "Subtotal"]
    widths  = [ANCHO*0.04, ANCHO*0.12, ANCHO*0.40,
               ANCHO*0.10, ANCHO*0.17, ANCHO*0.17]

    filas = [[Paragraph(h, st["th"]) for h in headers]]
    for i, it in enumerate(items, 1):
        filas.append([
            Paragraph(str(i),                                   st["td_center"]),
            Paragraph(it.get("codigo") or "—",                  st["td"]),
            Paragraph(it.get("nombre") or "—",                  st["td"]),
            Paragraph(str(it.get("cantidad", 0)),                st["td_center"]),
            Paragraph(_fmt_moneda(it.get("precio_unitario", 0)), st["td_right"]),
            Paragraph(_fmt_moneda(it.get("subtotal", 0)),        st["td_right"]),
        ])

    tabla = Table(filas, colWidths=widths, repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), AZUL_OSCURO),
        ("TEXTCOLOR",     (0,0), (-1,0), white),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,0), 8),
        ("ALIGN",         (0,0), (-1,0), "CENTER"),
        ("TOPPADDING",    (0,0), (-1,0), 5),
        ("BOTTOMPADDING", (0,0), (-1,0), 5),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [white, GRIS_CLARO]),
        ("GRID",          (0,0), (-1,-1), 0.3, GRIS_BORDE),
        ("BOX",           (0,0), (-1,-1), 0.8, AMARILLO),
        ("TOPPADDING",    (0,1), (-1,-1), 3),
        ("BOTTOMPADDING", (0,1), (-1,-1), 3),
        ("LEFTPADDING",   (0,0), (-1,-1), 4),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
    ]))
    return tabla


def _tabla_total(presupuesto: dict, st: dict) -> Table:
    total = presupuesto.get("total", 0)
    filas = [
        [Paragraph("TOTAL PRESUPUESTADO:", st["total_label"]),
         Paragraph(f"<b>{_fmt_moneda(total)}</b>", st["total_valor"])],
    ]
    tabla = Table(filas, colWidths=[ANCHO * 0.70, ANCHO * 0.30])
    tabla.setStyle(TableStyle([
        ("ALIGN",        (1,0), (1,-1), "RIGHT"),
        ("BACKGROUND",   (0,0), (-1,-1), AMARILLO_BG),
        ("BOX",          (0,0), (-1,-1), 0.8, AMARILLO),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]))
    return tabla


def _bloque_validez(presupuesto: dict, st: dict) -> Table:
    validez = presupuesto.get("validez_dias", VALIDEZ_DIAS)
    fecha_str = presupuesto.get("fecha", "")
    try:
        fecha_dt  = datetime.strptime(str(fecha_str)[:10], "%Y-%m-%d")
        vence_dt  = fecha_dt + timedelta(days=validez)
        vence_str = vence_dt.strftime("%d/%m/%Y")
    except Exception:
        vence_str = "—"

    texto = (
        f"Este presupuesto tiene una validez de <b>{validez} días</b> "
        f"a partir de la fecha de emisión. Válido hasta el <b>{vence_str}</b>. "
        "Los precios están sujetos a cambio sin previo aviso. "
        "Para confirmar el pedido comuníquese con nosotros."
    )
    tabla = Table(
        [[Paragraph(texto, st["validez"])]],
        colWidths=[ANCHO],
    )
    tabla.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), AMARILLO_BG),
        ("BOX",          (0,0), (-1,-1), 0.8, AMARILLO_BRD),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0), (-1,-1), 8),
        ("LEFTPADDING",  (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ]))
    return tabla


# ─── Estilos ──────────────────────────────────────────────────────────────────

def _build_styles() -> dict:
    s = {}
    def add(name, **kw): s[name] = ParagraphStyle(name, **kw)
    add("emp_sub",       fontSize=7.5, textColor=GRIS_TEXTO, leading=10)
    add("right_small",   fontSize=7,   alignment=TA_RIGHT, textColor=GRIS_TEXTO)
    add("right_nro",     fontSize=11,  alignment=TA_RIGHT,
        fontName="Helvetica-Bold", textColor=AZUL_OSCURO, leading=14)
    add("right_fecha",   fontSize=10,  alignment=TA_RIGHT,
        fontName="Helvetica-Bold", textColor=AZUL_OSCURO)
    add("section_title", fontSize=8,   fontName="Helvetica-Bold",
        textColor=AZUL_OSCURO, leading=11)
    add("label",         fontSize=7.5, fontName="Helvetica-Bold", textColor=GRIS_TEXTO)
    add("body",          fontSize=8,   textColor=black, leading=10)
    add("th",            fontSize=8,   fontName="Helvetica-Bold",
        textColor=white, alignment=TA_CENTER)
    add("td",            fontSize=8,   textColor=black, leading=10)
    add("td_center",     fontSize=8,   textColor=black, alignment=TA_CENTER)
    add("td_right",      fontSize=8,   textColor=black, alignment=TA_RIGHT)
    add("total_label",   fontSize=10,  fontName="Helvetica-Bold",
        textColor=AMARILLO, alignment=TA_RIGHT)
    add("total_valor",   fontSize=10,  fontName="Helvetica-Bold",
        textColor=AMARILLO, alignment=TA_RIGHT)
    add("validez",       fontSize=8,   textColor=AMARILLO, leading=12)
    add("pie",           fontSize=6.5, textColor=GRIS_TEXTO,
        alignment=TA_CENTER, leading=9)
    return s


# ─── Utilidades ───────────────────────────────────────────────────────────────

def _fmt_moneda(v) -> str:
    try:
        return f"$ {float(v):,.2f}".replace(",","X").replace(".",",").replace("X",".")
    except Exception:
        return "$ 0,00"

def _fmt_fecha(v) -> str:
    if not v: return ""
    try:
        dt = datetime.strptime(str(v)[:10], "%Y-%m-%d")
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(v)