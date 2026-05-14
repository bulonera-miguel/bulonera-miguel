# ============================================================
# afip_client.py — Cliente AFIP usando zeep (SOAP)
# Firma PKCS7 compatible con WSAA de AFIP/ARCA
# ============================================================

import os
import datetime
import base64
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.backends import default_backend
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs7
import zeep
from lxml import etree

# ── URLs de AFIP ─────────────────────────────────────────────
WSAA_URL_HOMO = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl"
WSAA_URL_PROD = "https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl"
WSFE_URL_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
WSFE_URL_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"

# ── Configuración desde .env ──────────────────────────────────
AFIP_CUIT      = int(os.getenv("AFIP_CUIT", "0"))
AFIP_CERT_PATH = os.getenv("AFIP_CERT", "")
AFIP_KEY_PATH  = os.getenv("AFIP_KEY", "")
AFIP_MODO      = os.getenv("AFIP_MODO", "homologacion")
AFIP_PV        = int(os.getenv("AFIP_PUNTO_VENTA", "1"))

PRODUCCION = AFIP_MODO == "produccion"


def _generar_tra(servicio: str) -> bytes:
    """Genera el Ticket de Requerimiento de Acceso (TRA) en XML."""
    ahora      = datetime.datetime.utcnow()
    generacion = (ahora - datetime.timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
    expiracion = (ahora + datetime.timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M:%S")
    unique_id  = str(int(ahora.timestamp()))

    tra = f"""<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>{unique_id}</uniqueId>
    <generationTime>{generacion}</generationTime>
    <expirationTime>{expiracion}</expirationTime>
  </header>
  <service>{servicio}</service>
</loginTicketRequest>"""
    return tra.encode("utf-8")


def _firmar_tra(tra_bytes: bytes) -> str:
    """
    Firma el TRA con el certificado digital.
    Usa OpenSSL subprocess para garantizar compatibilidad con AFIP.
    """
    import subprocess
    import tempfile

    # Escribimos el TRA a un archivo temporal
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as f:
        f.write(tra_bytes)
        tra_path = f.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".cms") as f:
        cms_path = f.name

    # Usamos openssl para firmar — compatible 100% con AFIP
    openssl_path = r"C:\Program Files\OpenSSL-Win64\bin\openssl.exe"

    cmd = [
        openssl_path, "cms", "-sign",
        "-in",    tra_path,
        "-out",   cms_path,
        "-signer",AFIP_CERT_PATH,
        "-inkey", AFIP_KEY_PATH,
        "-nodetach",
        "-outform", "PEM",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"Error al firmar TRA: {result.stderr}")

    # Leer el CMS y extraer solo el base64 (sin headers PEM)
    with open(cms_path, "r") as f:
        pem_content = f.read()

    # Eliminar headers PEM y saltos de línea
    lines = pem_content.strip().split("\n")
    b64_lines = [l for l in lines if not l.startswith("-----")]
    cms_b64 = "".join(b64_lines)

    # Limpiar archivos temporales
    import os
    os.unlink(tra_path)
    os.unlink(cms_path)

    return cms_b64


def obtener_token_sign(servicio: str = "wsfe") -> tuple[str, str]:
    """
    Autentica con WSAA y devuelve (token, sign).
    """
    tra_bytes = _generar_tra(servicio)
    cms_b64   = _firmar_tra(tra_bytes)

    wsaa_url = WSAA_URL_PROD if PRODUCCION else WSAA_URL_HOMO
    client   = zeep.Client(wsaa_url)
    response = client.service.loginCms(in0=cms_b64)

    # Parsear el XML de respuesta
    root  = etree.fromstring(response.encode("utf-8"))
    token = root.findtext(".//token")
    sign  = root.findtext(".//sign")

    if not token or not sign:
        raise Exception(f"WSAA no devolvió token/sign. Respuesta: {response}")

    return token, sign


def get_wsfe_client():
    """Devuelve el cliente SOAP del WSFE."""
    wsfe_url = WSFE_URL_PROD if PRODUCCION else WSFE_URL_HOMO
    return zeep.Client(wsfe_url)


def get_auth() -> dict:
    """Devuelve el objeto de autenticación para el WSFE."""
    token, sign = obtener_token_sign("wsfe")
    return {
        "Token": token,
        "Sign":  sign,
        "Cuit":  AFIP_CUIT,
    }
