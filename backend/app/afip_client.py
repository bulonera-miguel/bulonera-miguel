# ============================================================
# afip_client.py — Cliente AFIP usando zeep (SOAP)
# Homologación: SSL verification deshabilitado (solo para pruebas)
# ============================================================

import os
import datetime
import subprocess
import tempfile
import zeep
import zeep.transports
import requests
from requests import Session
from zeep.transports import Transport
from lxml import etree

# ── imports nuevos para SSL ──
import ssl
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context

# ── clase nueva ──
class DhSmallAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        ctx = create_urllib3_context(ciphers='DEFAULT@SECLEVEL=1')
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        kwargs['ssl_context'] = ctx
        super().init_poolmanager(*args, **kwargs)

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

# Ruta de OpenSSL en Windows
OPENSSL = r"C:\Program Files\OpenSSL-Win64\bin\openssl.exe"


def _generar_tra(servicio: str) -> bytes:
    """Genera el Ticket de Requerimiento de Acceso (TRA) en XML."""
    ahora      = datetime.datetime.now(datetime.timezone.utc)
    generacion = (ahora - datetime.timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    expiracion = (ahora + datetime.timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M:%S+00:00")
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
    """Firma el TRA usando OpenSSL subprocess."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as f:
        f.write(tra_bytes)
        tra_path = f.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".cms") as f:
        cms_path = f.name

    cmd = [
        OPENSSL, "cms", "-sign",
        "-in",      tra_path,
        "-out",     cms_path,
        "-signer",  AFIP_CERT_PATH,
        "-inkey",   AFIP_KEY_PATH,
        "-nodetach",
        "-outform", "PEM",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Error al firmar TRA: {result.stderr}")

    with open(cms_path, "r") as f:
        pem_content = f.read()

    lines   = pem_content.strip().split("\n")
    b64     = "".join(l for l in lines if not l.startswith("-----"))

    os.unlink(tra_path)
    os.unlink(cms_path)

    return b64


def _get_session() -> Session:
    session = Session()
    session.mount('https://', DhSmallAdapter())
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    return session


def obtener_token_sign(servicio: str = "wsfe") -> tuple[str, str]:
    """Autentica con WSAA y devuelve (token, sign)."""
    tra_bytes = _generar_tra(servicio)
    cms_b64   = _firmar_tra(tra_bytes)

    wsaa_url  = WSAA_URL_PROD if PRODUCCION else WSAA_URL_HOMO
    session   = _get_session()
    transport = Transport(session=session)
    client    = zeep.Client(wsaa_url, transport=transport)

    response  = client.service.loginCms(in0=cms_b64)

    root  = etree.fromstring(response.encode("utf-8"))
    token = root.findtext(".//token")
    sign  = root.findtext(".//sign")

    if not token or not sign:
        raise Exception(f"WSAA no devolvió token/sign. Respuesta: {response}")

    return token, sign


def get_wsfe_client():
    """Devuelve el cliente SOAP del WSFE."""
    wsfe_url  = WSFE_URL_PROD if PRODUCCION else WSFE_URL_HOMO
    session   = _get_session()
    transport = Transport(session=session)
    return zeep.Client(wsfe_url, transport=transport)


def get_auth() -> dict:
    """Devuelve el objeto de autenticación para el WSFE."""
    token, sign = obtener_token_sign("wsfe")
    print(f">>> Token obtenido (primeros 20 chars): {token[:20]}")
    print(f">>> CUIT usado: {AFIP_CUIT}")
    return {
        "Token": token,
        "Sign":  sign,
        "Cuit":  AFIP_CUIT,
    }