from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
from app.database import supabase
from app.afip_client import get_wsfe_client, get_auth, AFIP_PV, AFIP_MODO

router = APIRouter(
    prefix="/api/facturacion",
    tags=["Facturación"],
)

# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class ItemFactura(BaseModel):
    producto_id:     str
    cantidad:        int
    precio_unitario: float
    descripcion:     Optional[str] = None

class FacturaCreate(BaseModel):
    tipo:          str  # "A" o "B"
    cliente_id:    Optional[str] = None
    items:         List[ItemFactura]
    observaciones: Optional[str] = None

class ClienteCreate(BaseModel):
    nombre:       str
    tipo_factura: str = "B"
    cuit:         Optional[str] = None
    direccion:    Optional[str] = None
    telefono:     Optional[str] = None
    email:        Optional[str] = None

# ─── CLIENTES ─────────────────────────────────────────────────────────────────

@router.get("/clientes", response_model=list[dict])
async def listar_clientes():
    try:
        response = supabase.table("clientes").select("*").order("nombre").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clientes/buscar", response_model=list[dict])
async def buscar_clientes(q: str):
    try:
        response = supabase.table("clientes").select("*").ilike("nombre", f"%{q}%").limit(10).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clientes", status_code=201)
async def crear_cliente(datos: ClienteCreate):
    try:
        response = supabase.table("clientes").insert({
            "nombre":       datos.nombre,
            "tipo_factura": datos.tipo_factura,
            "cuit":         datos.cuit,
            "direccion":    datos.direccion,
            "telefono":     datos.telefono,
            "email":        datos.email,
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── TEST AFIP ────────────────────────────────────────────────────────────────

@router.get("/test-afip")
async def test_afip():
    """Verifica la conexión con AFIP sin autenticación."""
    try:
        client = get_wsfe_client()
        estado = client.service.FEDummy()
        return {
            "ok":         True,
            "modo":       AFIP_MODO,
            "AppServer":  estado.AppServer,
            "DbServer":   estado.DbServer,
            "AuthServer": estado.AuthServer,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error AFIP: {str(e)}")

# ─── ÚLTIMO COMPROBANTE ───────────────────────────────────────────────────────

@router.get("/ultimo-comprobante")
async def ultimo_comprobante(tipo: str):
    try:
        auth      = get_auth()
        client    = get_wsfe_client()
        tipo_cbte = 1 if tipo == "A" else 6
        response  = client.service.FECompUltimoAutorizado(
            Auth     = auth,
            PtoVta   = AFIP_PV,
            CbteTipo = tipo_cbte,
        )
        return {
            "ultimo_numero": response.CbteNro,
            "tipo":          tipo,
            "punto_venta":   AFIP_PV,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error AFIP: {str(e)}")

# ─── EMITIR FACTURA ───────────────────────────────────────────────────────────

@router.post("/emitir", status_code=201)
async def emitir_factura(datos: FacturaCreate):
    try:
        # PASO 1: Calcular totales
        subtotal = round(sum(i.cantidad * i.precio_unitario for i in datos.items), 2)
        if datos.tipo == "A":
            neto   = round(subtotal / 1.21, 2)
            iva_21 = round(neto * 0.21, 2)
            total  = subtotal
        else:
            # Factura B: IVA incluido en el precio, se desglosa igual
            neto   = round(subtotal / 1.21, 2)
            iva_21 = round(neto * 0.21, 2)
            total  = subtotal

        # PASO 2: Obtener último comprobante
        auth      = get_auth()
        client    = get_wsfe_client()
        tipo_cbte = 1 if datos.tipo == "A" else 6
        ultimo    = client.service.FECompUltimoAutorizado(
            Auth     = auth,
            PtoVta   = AFIP_PV,
            CbteTipo = tipo_cbte,
        )
        numero_cbte = ultimo.CbteNro + 1
        fecha_hoy   = datetime.now().strftime("%Y%m%d")

        # PASO 3: Datos del receptor
        if datos.tipo == "A" and datos.cliente_id:
            cliente_db    = supabase.table("clientes").select("*").eq("id", datos.cliente_id).single().execute()
            cuit_receptor = int(cliente_db.data["cuit"].replace("-", "").replace(" ", ""))
            doc_tipo      = 80
        else:
            cuit_receptor = 0
            doc_tipo      = 99

        # PASO 4: Armar comprobante
        # Tanto A como B requieren desglose de IVA según RG 5616
        detalle_iva = [{"Id": 5, "BaseImp": neto, "Importe": iva_21}]

        comprobante = {
            "FeCabReq": {
                "CantReg":  1,
                "PtoVta":   AFIP_PV,
                "CbteTipo": tipo_cbte,
            },
            "FeDetReq": {
                "FECAEDetRequest": [{
                    "Concepto":   1,
                    "DocTipo":    doc_tipo,
                    "DocNro":     cuit_receptor,
                    "CondicionIVAReceptorId": 5,
                    "CbteDesde":  numero_cbte,
                    "CbteHasta":  numero_cbte,
                    "CbteFch":    fecha_hoy,
                    "ImpTotal":   total,
                    "ImpTotConc": 0,
                    "ImpNeto":    neto,
                    "ImpOpEx":    0,
                    "ImpIVA":     iva_21,
                    "ImpTrib":    0,
                    "MonId":      "PES",
                    "MonCotiz":   1,
                    "Iva":        {"AlicIva": detalle_iva} if detalle_iva else None,
                }]
            }
        }

        # PASO 5: Enviar a AFIP
        resultado = client.service.FECAESolicitar(Auth=auth, FeCAEReq=comprobante)
        detalle   = resultado.FeDetResp.FECAEDetResponse[0]

        if detalle.Resultado != "A":
            errores = []
            if detalle.Observaciones:
                for obs in detalle.Observaciones.Obs:
                    errores.append(f"{obs.Code}: {obs.Msg}")
            raise HTTPException(status_code=400, detail=f"AFIP rechazó: {', '.join(errores)}")

        cae        = detalle.CAE
        cae_vto    = detalle.CAEFchVto
        numero_str = f"{AFIP_PV:05d}-{numero_cbte:08d}"

        # PASO 6: Guardar factura
        factura_db = supabase.table("facturas").insert({
            "numero":     numero_str,
            "tipo":       datos.tipo,
            "cliente_id": datos.cliente_id,
            "subtotal":   subtotal,
            "iva":        iva_21,
            "total":      total,
            "estado":     "emitida",
        }).execute()
        factura_id = factura_db.data[0]["id"]

        # PASO 7: Guardar items
        supabase.table("factura_items").insert([
            {
                "factura_id":      factura_id,
                "producto_id":     item.producto_id,
                "cantidad":        item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal":        round(item.cantidad * item.precio_unitario, 2),
            }
            for item in datos.items
        ]).execute()

        # PASO 8: Actualizar stock
        for item in datos.items:
            supabase.table("movimientos_stock").insert({
                "producto_id": item.producto_id,
                "tipo":        "salida",
                "cantidad":    item.cantidad,
                "motivo":      f"Factura {numero_str}",
                "factura_id":  factura_id,
            }).execute()
            prod = supabase.table("productos").select("stock_actual").eq("id", item.producto_id).single().execute()
            supabase.table("productos").update({
                "stock_actual": prod.data["stock_actual"] - item.cantidad
            }).eq("id", item.producto_id).execute()

        return {
            "ok":         True,
            "factura_id": factura_id,
            "numero":     numero_str,
            "tipo":       datos.tipo,
            "cae":        cae,
            "cae_vto":    cae_vto,
            "total":      total,
            "subtotal":   subtotal,
            "iva":        iva_21,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al emitir factura: {str(e)}")

# ─── LISTAR FACTURAS ──────────────────────────────────────────────────────────

@router.get("/facturas", response_model=list[dict])
async def listar_facturas():
    try:
        response = (
            supabase.table("facturas")
            .select("*, clientes(nombre, cuit)")
            .order("created_at", desc=True)
            .limit(100)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── DETALLE DE FACTURA ───────────────────────────────────────────────────────

@router.get("/facturas/{factura_id}")
async def detalle_factura(factura_id: str):
    try:
        factura = (
            supabase.table("facturas")
            .select("*, clientes(nombre, cuit, direccion)")
            .eq("id", factura_id)
            .single()
            .execute()
        )
        items = (
            supabase.table("factura_items")
            .select("*, productos(codigo, nombre)")
            .eq("factura_id", factura_id)
            .execute()
        )
        return {**factura.data, "items": items.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
