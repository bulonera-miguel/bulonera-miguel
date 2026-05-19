"""
email_service.py — Servicio de envío de facturas por email
Bulonera Miguel — SMTP Gmail con App Password

Requiere en .env:
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=tu-cuenta@gmail.com
    SMTP_PASSWORD=xxxx xxxx xxxx xxxx
    SMTP_FROM_NAME=Bulonera Miguel
"""

import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text       import MIMEText
from email.mime.base       import MIMEBase
from email                 import encoders


# ─── Configuración SMTP desde .env ────────────────────────────────────────────
SMTP_HOST      = os.getenv("SMTP_HOST",      "smtp.gmail.com")
SMTP_PORT      = int(os.getenv("SMTP_PORT",  "587"))
SMTP_USER      = os.getenv("SMTP_USER",      "")
SMTP_PASSWORD  = os.getenv("SMTP_PASSWORD",  "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Bulonera Miguel")


def enviar_factura_por_email(
    email_destino:  str,
    numero_factura: str,
    tipo_factura:   str,
    nombre_cliente: str,
    total:          float,
    cae:            str,
    pdf_bytes:      bytes,
) -> None:
    """
    Envía la factura en PDF al cliente por email.

    Parámetros:
        email_destino  — dirección del cliente
        numero_factura — ej: "B-00001-00000042"
        tipo_factura   — "A" o "B"
        nombre_cliente — nombre para el saludo
        total          — importe total de la factura
        cae            — código CAE para referencia
        pdf_bytes      — bytes del PDF ya generado

    Lanza ValueError si faltan credenciales SMTP.
    Lanza smtplib.SMTPException si falla el envío.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        raise ValueError(
            "Faltan credenciales SMTP. "
            "Configurá SMTP_USER y SMTP_PASSWORD en el archivo .env"
        )

    # ── Formatear total en pesos argentinos ───────────────────────────────────
    total_fmt = f"$ {float(total):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    # ── Nombre del archivo adjunto ────────────────────────────────────────────
    nombre_archivo = f"Factura_{numero_factura.replace('-', '_')}.pdf"

    # ── Asunto ────────────────────────────────────────────────────────────────
    asunto = f"Factura {numero_factura} — Bulonera Miguel"

    # ── Cuerpo HTML ───────────────────────────────────────────────────────────
    html_body = f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:#1a2744;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:0.5px;">
                BULONERA MIGUEL
              </h1>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">
                Av. Buchardo 2268 · Posadas, Misiones · Tel: 0376 494-7546
              </p>
            </td>
          </tr>

          <!-- ── CUERPO ── -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">
                Estimado/a <strong>{nombre_cliente}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                Adjuntamos su comprobante electrónico emitido a través del sistema
                de Facturación Electrónica de <strong>ARCA (ex AFIP)</strong>.
                El PDF se encuentra adjunto a este correo.
              </p>

              <!-- ── RECUADRO RESUMEN ── -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                            border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="4" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#64748b;width:50%;">Número de comprobante</td>
                        <td style="font-size:13px;color:#1e293b;font-weight:bold;text-align:right;">
                          {numero_factura}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#64748b;">Tipo</td>
                        <td style="font-size:13px;color:#1e293b;font-weight:bold;text-align:right;">
                          Factura {tipo_factura}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#64748b;">CAE</td>
                        <td style="font-size:13px;color:#1e293b;font-weight:bold;text-align:right;">
                          {cae}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2"
                            style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:8px;">
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;color:#1e293b;font-weight:bold;">
                          Total
                        </td>
                        <td style="font-size:18px;color:#2563eb;font-weight:bold;text-align:right;">
                          {total_fmt}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.6;">
                Puede verificar la autenticidad del comprobante escaneando el
                <strong>código QR</strong> incluido en el PDF o ingresando el CAE
                en el sitio oficial de ARCA:
                <a href="https://www.afip.gob.ar/fe/qr/"
                   style="color:#2563eb;">www.afip.gob.ar/fe/qr/</a>
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;
                       padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                Bulonera Miguel S.R.L. · CUIT 20-18572102-8 · Responsable Inscripto<br>
                ventas@buloneramiguel.com.ar · 0376 494-7546<br>
                Este es un correo automático, por favor no responda a esta dirección.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

    # ── Texto plano (fallback para clientes sin HTML) ─────────────────────────
    texto_plano = (
        f"Estimado/a {nombre_cliente},\n\n"
        f"Adjuntamos su factura electrónica emitida por Bulonera Miguel.\n\n"
        f"Número: {numero_factura}\n"
        f"Tipo: Factura {tipo_factura}\n"
        f"Total: {total_fmt}\n"
        f"CAE: {cae}\n\n"
        f"El comprobante en PDF se encuentra adjunto.\n\n"
        f"Bulonera Miguel S.R.L.\n"
        f"CUIT: 20-18572102-8\n"
        f"Tel: 0376 494-7546\n"
        f"ventas@buloneramiguel.com.ar\n"
    )

    # ── Armar mensaje MIME ────────────────────────────────────────────────────
    msg = MIMEMultipart("alternative")
    msg["Subject"] = asunto
    msg["From"]    = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"]      = email_destino

    # Parte texto plano y HTML
    msg.attach(MIMEText(texto_plano, "plain", "utf-8"))
    msg.attach(MIMEText(html_body,   "html",  "utf-8"))

    # ── Adjuntar PDF ──────────────────────────────────────────────────────────
    # Creamos un mensaje multipart/mixed para poder poner tanto HTML como adjunto
    msg_outer = MIMEMultipart("mixed")
    msg_outer["Subject"] = asunto
    msg_outer["From"]    = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg_outer["To"]      = email_destino

    msg_outer.attach(msg)  # cuerpo HTML/texto como parte

    adjunto = MIMEBase("application", "pdf")
    adjunto.set_payload(pdf_bytes)
    encoders.encode_base64(adjunto)
    adjunto.add_header(
        "Content-Disposition",
        "attachment",
        filename=nombre_archivo,
    )
    msg_outer.attach(adjunto)

    # ── Enviar por SMTP con TLS (Gmail puerto 587) ────────────────────────────
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as servidor:
        servidor.ehlo()
        servidor.starttls()
        servidor.ehlo()
        servidor.login(SMTP_USER, SMTP_PASSWORD)
        servidor.sendmail(SMTP_USER, email_destino, msg_outer.as_string())
