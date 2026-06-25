"""
pdf_factura.py — Generador de PDF de Factura Electrónica ARCA (ex AFIP)
Bulonera Miguel — Formato A4 oficial

Requiere: reportlab, qrcode[pil], Pillow
Instalar: pip install reportlab qrcode[pil] Pillow
"""

import io
import qrcode
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import (
    HexColor, black, white, Color
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image
)
from reportlab.graphics.shapes import Drawing, Rect, Line, String
from reportlab.graphics import renderPDF


# ─── Paleta de colores ────────────────────────────────────────────────────────
AZUL_OSCURO   = HexColor("#1a2744")   # Header empresa
AZUL_MEDIO    = HexColor("#2563eb")   # Accentos, bordes
AZUL_CLARO    = HexColor("#dbeafe")   # Fondo cabecera tabla
GRIS_CLARO    = HexColor("#f8fafc")   # Fondo filas par
GRIS_BORDE    = HexColor("#cbd5e1")   # Bordes suaves
GRIS_TEXTO    = HexColor("#475569")   # Texto secundario
VERDE_CAE     = HexColor("#16a34a")   # Sección CAE
ROJO_TIPO     = HexColor("#dc2626")   # Letra del comprobante (A = rojo)

# ─── Datos de la empresa (ajustar en producción) ──────────────────────────────
EMPRESA = {
    "nombre":       "BULONERA MIGUEL S.R.L.",
    "razon_social": "Bulonera Miguel S.R.L.",
    "cuit":         "20-18572102-8",
    "domicilio":    "Av. Buchardo 2268, Posadas, Misiones",
    "telefono":     "3764-236105",
    "email":        "bulonera.miguel@gmail.com",
    "ingresos_brutos": "20185721028",
    "inicio_actividades": "01/01/2025",
    "condicion_iva": "Responsable Inscripto",
    "punto_venta":  "0001",
}

# ─── Función principal ────────────────────────────────────────────────────────
def generar_pdf_factura(factura: dict) -> bytes:
    """
    Genera el PDF de una factura ARCA en formato A4.

    Parámetro `factura` (dict) con las claves:
      - numero_comprobante: str  → "00001-00000001"
      - tipo_comprobante: str    → "A" | "B" | "C"
      - fecha_emision: str       → "2024-06-01" o datetime
      - cae: str                 → código CAE de 14 dígitos
      - cae_vencimiento: str     → "2024-06-11"
      - cliente: dict
            nombre, cuit_dni, domicilio, condicion_iva
      - items: list[dict]
            descripcion, cantidad, precio_unitario, subtotal
      - subtotal: float
      - iva_porcentaje: float    → 21.0
      - iva_monto: float
      - total: float
      - observaciones: str (opcional)

    Retorna: bytes del PDF.
    """

    buffer = io.BytesIO()

    # Márgenes: izq 15mm, der 15mm, sup 20mm, inf 20mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=f"Factura {factura.get('numero_comprobante', '')}",
        author=EMPRESA["razon_social"],
    )

    story = []
    styles = _build_styles()
    tipo = factura.get("tipo_comprobante", "B").upper()

    # ── 1. Encabezado ─────────────────────────────────────────────────────────
    story.append(_encabezado(factura, tipo, styles))
    story.append(Spacer(1, 6 * mm))

    # ── 2. Datos empresa + cliente (dos columnas) ─────────────────────────────
    story.append(_bloque_empresa_cliente(factura, styles))
    story.append(Spacer(1, 6 * mm))

    # ── 3. Tabla de ítems ─────────────────────────────────────────────────────
    story.append(_tabla_items(factura, styles))
    story.append(Spacer(1, 4 * mm))

    # ── 4. Totales ────────────────────────────────────────────────────────────
    story.append(_tabla_totales(factura, tipo, styles))
    story.append(Spacer(1, 6 * mm))

    # ── 5. CAE + QR ───────────────────────────────────────────────────────────
    story.append(_bloque_cae_qr(factura, styles))
    story.append(Spacer(1, 4 * mm))

    # ── 6. Observaciones (opcional) ───────────────────────────────────────────
    obs = factura.get("observaciones", "").strip()
    if obs:
        story.append(Paragraph("<b>Observaciones:</b>", styles["label"]))
        story.append(Paragraph(obs, styles["body_small"]))
        story.append(Spacer(1, 3 * mm))

    # ── 7. Pie de página legal ────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRIS_BORDE))
    story.append(Spacer(1, 2 * mm))
    story.append(_pie_legal(styles))

    doc.build(story)
    return buffer.getvalue()


# ─── Helpers de sección ───────────────────────────────────────────────────────

def _encabezado(factura: dict, tipo: str, styles) -> Table:
    """
    Cabecera dividida en tres columnas:
    [Datos empresa]  |  [Letra grande]  |  [Tipo + Número]
    """
    # Columna izquierda — empresa
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo-bm-pdf.png")
    col_empresa = []
    if os.path.exists(logo_path):
        from PIL import Image as PILImage
        with PILImage.open(logo_path) as img:
            ancho_px, alto_px = img.size
            proporcion = alto_px / ancho_px
            ancho_logo = 55*mm
            alto_logo = ancho_logo * proporcion
        col_empresa.append(Image(logo_path, width=ancho_logo, height=alto_logo))
        col_empresa.append(Spacer(1, 2*mm))
    col_empresa += [       
        Paragraph(EMPRESA["domicilio"], styles["empresa_sub"]),
        Paragraph(f"Tel: {EMPRESA['telefono']}", styles["empresa_sub"]),
        Paragraph(f"Email: {EMPRESA['email']}", styles["empresa_sub"]),
    ]

    # Columna central — letra
    color_letra = ROJO_TIPO if tipo == "A" else AZUL_MEDIO
    letra_style = ParagraphStyle(
        "letra",
        fontSize=56,
        textColor=color_letra,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        leading=60,
    )
    col_letra = [
        Paragraph(tipo, letra_style),
        Paragraph(
            f"<font size='7' color='#{_hex(GRIS_TEXTO)}'>COMPROBANTE TIPO {tipo}</font>",
            styles["center_small"],
        ),
    ]

    # Columna derecha — número y fecha
    nro = factura.get("numero_comprobante", "00001-00000001")
    fecha = _fmt_fecha(factura.get("fecha_emision", ""))
    col_numero = [
        Paragraph(
            f"<font size='7' color='#{_hex(GRIS_TEXTO)}'>FACTURA</font>",
            styles["right_small"],
        ),
        Paragraph(f"<b>{nro}</b>", styles["right_nro"]),
        Spacer(1, 2 * mm),
        Paragraph(
            f"<font size='7' color='#{_hex(GRIS_TEXTO)}'>Fecha de emisión</font>",
            styles["right_small"],
        ),
        Paragraph(f"<b>{fecha}</b>", styles["right_fecha"]),
        Spacer(1, 2 * mm),
        Paragraph(
            f"<font size='7' color='#{_hex(GRIS_TEXTO)}'>CUIT: {EMPRESA['cuit']}</font>",
            styles["right_small"],
        ),
        Paragraph(
            f"<font size='7' color='#{_hex(GRIS_TEXTO)}'>IIBB: {EMPRESA['ingresos_brutos']}</font>",
            styles["right_small"],
        ),
        Paragraph(
            f"<font size='7' color='#{_hex(GRIS_TEXTO)}'>Inicio act.: {EMPRESA['inicio_actividades']}</font>",
            styles["right_small"],
        ),
        Paragraph(
            f"<font size='7' color='#{_hex(GRIS_TEXTO)}'>{EMPRESA['condicion_iva']}</font>",
            styles["right_small"],
        ),
    ]

    ancho_pagina = A4[0] - 30 * mm  # margen total 30mm
    tabla = Table(
        [[col_empresa, col_letra, col_numero]],
        colWidths=[ancho_pagina * 0.42, ancho_pagina * 0.16, ancho_pagina * 0.42],
    )
    tabla.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LINEAFTER",    (0, 0), (0, 0), 1, GRIS_BORDE),
        ("LINEAFTER",    (1, 0), (1, 0), 1, GRIS_BORDE),
        ("BACKGROUND",   (0, 0), (-1, -1), GRIS_CLARO),
        ("BOX",          (0, 0), (-1, -1), 1, GRIS_BORDE),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GRIS_CLARO]),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ALIGN",        (1, 0), (1, 0), "CENTER"),
    ]))
    return tabla


def _bloque_empresa_cliente(factura: dict, styles) -> Table:
    """Dos columnas: datos empresa (izq) y datos cliente (der)."""
    cliente = factura.get("cliente", {})

    def item(label, valor):
        return [
            Paragraph(label, styles["label"]),
            Paragraph(str(valor) if valor else "—", styles["body_small"]),
        ]

    col_cliente = Table(
        [
            [Paragraph("DATOS DEL CLIENTE", styles["section_title"])],
            *[item(k, v) for k, v in [
                ("Nombre / Razón Social:", cliente.get("nombre", "")),
                ("CUIT / DNI:",           cliente.get("cuit_dni", "")),
                ("Domicilio:",            cliente.get("domicilio", "")),
                ("Condición IVA:",        cliente.get("condicion_iva", "Consumidor Final")),
            ]],
        ],
        colWidths=["35%", "65%"],
    )
    col_cliente.setStyle(TableStyle([
        ("SPAN",        (0, 0), (1, 0)),
        ("BACKGROUND",  (0, 0), (1, 0), AZUL_CLARO),
        ("TEXTCOLOR",   (0, 0), (1, 0), AZUL_OSCURO),
        ("BOX",         (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("GRID",        (0, 1), (-1, -1), 0.3, GRIS_BORDE),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))

    ancho = A4[0] - 30 * mm
    tabla = Table([[col_cliente]], colWidths=[ancho])
    tabla.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                                ("RIGHTPADDING",(0, 0), (-1, -1), 0)]))
    return tabla


def _tabla_items(factura: dict, styles) -> Table:
    """Tabla de productos/servicios facturados."""
    items = factura.get("items", [])
    tipo = factura.get("tipo_comprobante", "B").upper()

    # Encabezados
    if tipo == "A":
        headers = ["#", "Descripción", "Cant.", "P. Unitario s/IVA", "Subtotal s/IVA"]
        col_widths_pct = [0.04, 0.46, 0.10, 0.20, 0.20]
    else:
        headers = ["#", "Descripción", "Cant.", "P. Unitario", "Subtotal"]
        col_widths_pct = [0.04, 0.46, 0.10, 0.20, 0.20]

    ancho = A4[0] - 30 * mm
    col_widths = [ancho * p for p in col_widths_pct]

    header_row = [Paragraph(h, styles["table_header"]) for h in headers]
    rows = [header_row]

    for i, it in enumerate(items, 1):
        precio = it.get("precio_unitario", 0)
        cant   = it.get("cantidad", 0)
        sub    = it.get("subtotal", precio * cant)
        rows.append([
            Paragraph(str(i),                          styles["table_cell_center"]),
            Paragraph(it.get("descripcion", ""),        styles["table_cell"]),
            Paragraph(_fmt_num(cant, decimales=2),      styles["table_cell_right"]),
            Paragraph(_fmt_moneda(precio),              styles["table_cell_right"]),
            Paragraph(_fmt_moneda(sub),                 styles["table_cell_right"]),
        ])

    tabla = Table(rows, colWidths=col_widths, repeatRows=1)

    ts = [
        ("BACKGROUND",   (0, 0), (-1, 0), AZUL_OSCURO),
        ("TEXTCOLOR",    (0, 0), (-1, 0), white),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 8),
        ("ALIGN",        (0, 0), (-1, 0), "CENTER"),
        ("TOPPADDING",   (0, 0), (-1, 0), 5),
        ("BOTTOMPADDING",(0, 0), (-1, 0), 5),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLARO]),
        ("GRID",         (0, 0), (-1, -1), 0.3, GRIS_BORDE),
        ("BOX",          (0, 0), (-1, -1), 0.8, AZUL_MEDIO),
        ("TOPPADDING",   (0, 1), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 1), (-1, -1), 3),
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    tabla.setStyle(TableStyle(ts))
    return tabla


def _tabla_totales(factura: dict, tipo: str, styles) -> Table:
    """Totales alineados a la derecha."""
    subtotal    = factura.get("subtotal", 0)
    iva_pct     = factura.get("iva_porcentaje", 21.0)
    iva_monto   = factura.get("iva_monto", 0)
    total       = factura.get("total", 0)

    ancho = A4[0] - 30 * mm
    col_label = ancho * 0.70
    col_valor = ancho * 0.30

    filas = []
    if tipo == "A":
        filas.append(["Subtotal (neto gravado):", _fmt_moneda(subtotal)])
        filas.append([f"IVA {iva_pct:.0f}%:",       _fmt_moneda(iva_monto)])
    else:
        filas.append(["Subtotal:",                  _fmt_moneda(subtotal)])
        if iva_monto:
            filas.append([f"IVA {iva_pct:.0f}% incluido:", _fmt_moneda(iva_monto)])

    filas.append(["TOTAL:", _fmt_moneda(total)])  # última fila resaltada

    data = [
        [Paragraph(f[0], styles["total_label"]), Paragraph(f[1], styles["total_valor"])]
        for f in filas
    ]
    # Última fila — total destacado
    data[-1] = [
        Paragraph(f"<b>{filas[-1][0]}</b>", styles["total_label_bold"]),
        Paragraph(f"<b>{filas[-1][1]}</b>", styles["total_valor_bold"]),
    ]

    tabla = Table(data, colWidths=[col_label, col_valor])
    ts = [
        ("ALIGN",        (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE",    (0, -1), (-1, -1), 1.5, AZUL_MEDIO),
        ("BACKGROUND",   (0, -1), (-1, -1), AZUL_CLARO),
        ("BOX",          (0, -1), (-1, -1), 0.8, AZUL_MEDIO),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    tabla.setStyle(TableStyle(ts))
    return tabla


def _bloque_cae_qr(factura: dict, styles) -> Table:
    """
    Sección CAE + código QR ARCA (requerimiento legal).
    El QR apunta a la URL oficial de validación de AFIP/ARCA.
    """
    cae         = factura.get("cae", "")
    cae_vto     = _fmt_fecha(factura.get("cae_vencimiento", ""))
    nro         = factura.get("numero_comprobante", "")
    tipo        = factura.get("tipo_comprobante", "B")
    fecha       = _fmt_fecha(factura.get("fecha_emision", ""))
    total       = factura.get("total", 0)

    # URL QR ARCA — formato oficial
    cuit_emisor = EMPRESA["cuit"].replace("-", "")
    nro_parts   = nro.replace("-", "").split("-") if "-" in nro else [nro[:5], nro[5:]]
    pto_vta     = nro_parts[0].lstrip("0") or "1" if len(nro_parts) > 0 else "1"
    nro_cmp     = nro_parts[1].lstrip("0") or "1" if len(nro_parts) > 1 else nro.lstrip("0") or "1"
    tipo_num    = {"A": "1", "B": "6", "C": "11"}.get(tipo, "6")

    qr_url = (
        f"https://www.afip.gob.ar/fe/qr/?p="
        f"%7B%22ver%22%3A1%2C%22fecha%22%3A%22{factura.get('fecha_emision','')[:10]}%22%2C"
        f"%22cuit%22%3A{cuit_emisor}%2C%22ptoVta%22%3A{pto_vta}%2C"
        f"%22tipoCmp%22%3A{tipo_num}%2C%22nroCmp%22%3A{nro_cmp}%2C"
        f"%22importe%22%3A{total:.2f}%2C%22moneda%22%3A%22PES%22%2C"
        f"%22ctz%22%3A1%2C%22tipoDocRec%22%3A99%2C%22nroDocRec%22%3A0%2C"
        f"%22tipoCodAut%22%3A%22E%22%2C%22codAut%22%3A{cae}%7D"
    )

    # Generar imagen QR en memoria
    qr_img_data = _generar_qr(qr_url)
    qr_img = Image(qr_img_data, width=28 * mm, height=28 * mm)

    # Columna izquierda: datos CAE
    col_cae = [
        Paragraph("COMPROBANTE AUTORIZADO POR ARCA", styles["cae_title"]),
        Spacer(1, 2 * mm),
        Paragraph(f"<b>CAE:</b> {cae}", styles["cae_dato"]),
        Paragraph(f"<b>Vencimiento CAE:</b> {cae_vto}", styles["cae_dato"]),
        Spacer(1, 1 * mm),
        Paragraph(
            "Este comprobante es válido como comprobante fiscal. "
            "Verifique su autenticidad escaneando el código QR.",
            styles["cae_legal"],
        ),
    ]

    ancho = A4[0] - 30 * mm
    tabla = Table(
        [[col_cae, qr_img]],
        colWidths=[ancho * 0.75, ancho * 0.25],
    )
    tabla.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND",   (0, 0), (-1, -1), HexColor("#f0fdf4")),
        ("BOX",          (0, 0), (-1, -1), 1, VERDE_CAE),
        ("LINEAFTER",    (0, 0), (0, 0), 0.5, VERDE_CAE),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ALIGN",        (1, 0), (1, 0), "CENTER"),
    ]))
    return tabla


def _pie_legal(styles) -> Paragraph:
    texto = (
        "Factura emitida mediante el sistema de Facturación Electrónica de ARCA (ex AFIP). "
        f"Resolución General N° 4291/2018 y modificatorias. "
        f"Original — {EMPRESA['razon_social']} — {EMPRESA['cuit']} — {EMPRESA['condicion_iva']} ante el IVA. "
        "La empresa actúa como agente de percepción/retención según normativa vigente."
    )
    return Paragraph(texto, styles["pie"])


# ─── Estilos ──────────────────────────────────────────────────────────────────

def _build_styles() -> dict:
    base = getSampleStyleSheet()
    s = {}

    def add(name, **kw):
        s[name] = ParagraphStyle(name, **kw)

    add("empresa_nombre",  fontSize=13, fontName="Helvetica-Bold",
        textColor=AZUL_OSCURO, leading=15)
    add("empresa_sub",     fontSize=7.5, textColor=GRIS_TEXTO, leading=10)

    add("center_small",    fontSize=7, alignment=TA_CENTER, textColor=GRIS_TEXTO)
    add("right_small",     fontSize=7, alignment=TA_RIGHT,  textColor=GRIS_TEXTO)
    add("right_nro",       fontSize=11, alignment=TA_RIGHT,
        fontName="Helvetica-Bold", textColor=AZUL_OSCURO, leading=14)
    add("right_fecha",     fontSize=10, alignment=TA_RIGHT,
        fontName="Helvetica-Bold", textColor=AZUL_OSCURO)

    add("section_title",   fontSize=8, fontName="Helvetica-Bold",
        textColor=AZUL_OSCURO, leading=11)
    add("label",           fontSize=7.5, fontName="Helvetica-Bold",
        textColor=GRIS_TEXTO)
    add("body_small",      fontSize=8, textColor=black, leading=10)

    add("table_header",    fontSize=8, fontName="Helvetica-Bold",
        textColor=white, alignment=TA_CENTER)
    add("table_cell",      fontSize=8, textColor=black, leading=10)
    add("table_cell_right",fontSize=8, textColor=black, alignment=TA_RIGHT)
    add("table_cell_center",fontSize=8,textColor=black, alignment=TA_CENTER)

    add("total_label",     fontSize=8, textColor=GRIS_TEXTO, alignment=TA_RIGHT)
    add("total_valor",     fontSize=8, textColor=black,      alignment=TA_RIGHT)
    add("total_label_bold",fontSize=10,fontName="Helvetica-Bold",
        textColor=AZUL_OSCURO, alignment=TA_RIGHT)
    add("total_valor_bold",fontSize=10,fontName="Helvetica-Bold",
        textColor=AZUL_OSCURO, alignment=TA_RIGHT)

    add("cae_title",       fontSize=8, fontName="Helvetica-Bold",
        textColor=VERDE_CAE)
    add("cae_dato",        fontSize=8.5, textColor=black, leading=11)
    add("cae_legal",       fontSize=6.5, textColor=GRIS_TEXTO, leading=9)

    add("pie",             fontSize=6.5, textColor=GRIS_TEXTO,
        alignment=TA_CENTER, leading=9)

    return s


# ─── Utilidades ───────────────────────────────────────────────────────────────

def _fmt_moneda(valor) -> str:
    try:
        return f"$ {float(valor):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return "$ 0,00"


def _fmt_num(valor, decimales=2) -> str:
    try:
        return f"{float(valor):,.{decimales}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return "0,00"


def _fmt_fecha(valor) -> str:
    if not valor:
        return ""
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y")
    s = str(valor)
    try:
        # Intenta parsear ISO
        dt = datetime.strptime(s[:10], "%Y-%m-%d")
        return dt.strftime("%d/%m/%Y")
    except ValueError:
        return s


def _hex(color: Color) -> str:
    """Devuelve hex sin #, para usar en Paragraph markup."""
    try:
        h = color.hexColor() if hasattr(color, "hexColor") else None
        if h:
            return h.lstrip("#")
        # Fallback manual con los valores RGB
        r = int(color.red * 255)
        g = int(color.green * 255)
        b = int(color.blue * 255)
        return f"{r:02x}{g:02x}{b:02x}"
    except Exception:
        return "475569"


def _generar_qr(url: str) -> io.BytesIO:
    """Genera QR y devuelve BytesIO con la imagen PNG."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


# ─── Test rápido (python pdf_factura.py) ─────────────────────────────────────
if __name__ == "__main__":
    factura_demo = {
        "numero_comprobante": "00001-00000042",
        "tipo_comprobante":   "B",
        "fecha_emision":      "2024-06-01",
        "cae":                "74123456789012",
        "cae_vencimiento":    "2024-06-11",
        "cliente": {
            "nombre":       "Juan García",
            "cuit_dni":     "20-34567890-1",
            "domicilio":    "Rivadavia 456, Posadas, Misiones",
            "condicion_iva":"Consumidor Final",
        },
        "items": [
            {"descripcion": "Bulón hexagonal M8 x 30mm zincado (caja 100u)",
             "cantidad": 5, "precio_unitario": 1250.00, "subtotal": 6250.00},
            {"descripcion": "Tuerca M8 zincada (caja 100u)",
             "cantidad": 5, "precio_unitario":  480.00, "subtotal": 2400.00},
            {"descripcion": "Arandela plana M8 (bolsa 200u)",
             "cantidad": 3, "precio_unitario":  320.00, "subtotal":  960.00},
        ],
        "subtotal":      9610.00,
        "iva_porcentaje": 21.0,
        "iva_monto":     2018.10,
        "total":        11628.10,
        "observaciones": "Entrega en depósito. Válido 30 días.",
    }

    pdf_bytes = generar_pdf_factura(factura_demo)
    with open("factura_demo.pdf", "wb") as f:
        f.write(pdf_bytes)
    print(f"✅ PDF generado: factura_demo.pdf ({len(pdf_bytes):,} bytes)")
