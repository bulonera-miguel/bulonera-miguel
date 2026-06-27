# ============================================================
# routers/ventas.py — Registro de ventas
# Bulonera Miguel
#
# Cuando se registra una venta:
#   1. Se guarda en ventas (cabecera)
#   2. Se guardan los ítems en ventas_items
#   3. Se registra un movimiento de SALIDA en movimientos_stock
#   4. Se actualiza el stock_actual de cada producto
#   5. Si tiene factura asociada se vincula (opcional)
# ============================================================

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.database import supabase
from fastapi.responses import StreamingResponse
import io
from app.pdf_reportes import generar_pdf_reporte

router = APIRouter(
    prefix="/api/ventas",
    tags=["Ventas"],
)

# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class ItemVenta(BaseModel):
    producto_id:     str
    cantidad:        int
    precio_unitario: float

class VentaCreate(BaseModel):
    cliente_id:    Optional[str] = None
    fecha:         Optional[str] = None
    observaciones: Optional[str] = None
    factura_id:    Optional[str] = None
    items:         List[ItemVenta]


# ─── LISTAR VENTAS ────────────────────────────────────────────────────────────

@router.get("/", response_model=list[dict])
async def listar_ventas(
    cliente_id: Optional[str] = Query(None),
    desde:      Optional[date] = Query(None),
    hasta:      Optional[date] = Query(None),
):
    try:
        query = (
            supabase.table("ventas")
            .select("*, clientes(nombre, cuit)")
            .order("fecha", desc=True)
            .order("created_at", desc=True)
        )
        if cliente_id:
            query = query.eq("cliente_id", cliente_id)
        if desde:
            query = query.gte("fecha", desde.isoformat())
        if hasta:
            query = query.lte("fecha", hasta.isoformat())

        response = query.limit(200).execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar ventas: {str(e)}")


# ─── REGISTRAR VENTA ──────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def registrar_venta(datos: VentaCreate):
    try:
        if not datos.items:
            raise HTTPException(status_code=400, detail="La venta debe tener al menos un producto")

        # PASO 1: Calcular total
        total = round(sum(i.cantidad * i.precio_unitario for i in datos.items), 2)

        # PASO 2: Fecha
        fecha_venta = datos.fecha if datos.fecha else date.today().isoformat()

        # PASO 3: Crear cabecera de la venta
        venta_db = (
            supabase.table("ventas")
            .insert({
                "cliente_id":    datos.cliente_id,
                "fecha":         fecha_venta,
                "total":         total,
                "factura_id":    datos.factura_id,
                "observaciones": datos.observaciones,
            })
            .execute()
        )
        venta_id     = venta_db.data[0]["id"]
        numero_venta = f"V-{venta_id[:8].upper()}"

        # PASO 4: Guardar ítems + descontar stock de cada producto
        for item in datos.items:

            prod = (
                supabase.table("productos")
                .select("id, nombre, stock_actual, activo")
                .eq("id", item.producto_id)
                .single()
                .execute()
            )
            if not prod.data:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto {item.producto_id} no encontrado"
                )
            if not prod.data["activo"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"El producto '{prod.data['nombre']}' está inactivo"
                )
            if prod.data["stock_actual"] < item.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para '{prod.data['nombre']}'. "
                           f"Stock actual: {prod.data['stock_actual']}, "
                           f"cantidad solicitada: {item.cantidad}"
                )

            subtotal = round(item.cantidad * item.precio_unitario, 2)

            # Guardar ítem de venta
            supabase.table("ventas_items").insert({
                "venta_id":        venta_id,
                "producto_id":     item.producto_id,
                "cantidad":        item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal":        subtotal,
            }).execute()

            # Registrar movimiento de SALIDA en historial de stock
            supabase.table("movimientos_stock").insert({
                "producto_id": item.producto_id,
                "tipo":        "salida",
                "cantidad":    item.cantidad,
                "motivo":      f"Venta {numero_venta}",
            }).execute()

            # Actualizar stock_actual del producto
            nuevo_stock = prod.data["stock_actual"] - item.cantidad
            supabase.table("productos").update({
                "stock_actual": nuevo_stock
            }).eq("id", item.producto_id).execute()

        # Nombre del cliente para la respuesta
        nombre_cliente = "Consumidor Final"
        if datos.cliente_id:
            cli = (
                supabase.table("clientes")
                .select("nombre")
                .eq("id", datos.cliente_id)
                .single()
                .execute()
            )
            if cli.data:
                nombre_cliente = cli.data["nombre"]

        return {
            "ok":       True,
            "venta_id": venta_id,
            "numero":   numero_venta,
            "cliente":  nombre_cliente,
            "fecha":    fecha_venta,
            "total":    total,
            "items":    len(datos.items),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar venta: {str(e)}")


# ─── REPORTE VENTAS POR CLIENTE POR MES ──────────────────────────────────────

@router.get("/reportes/ventas-clientes", response_model=list[dict])
async def reporte_ventas_clientes(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    try:
        hoy = date.today()
        desde_query = desde or date(hoy.year, hoy.month, 1)
        hasta_query = hasta or (
            date(hoy.year + 1, 1, 1) if hoy.month == 12
            else date(hoy.year, hoy.month + 1, 1)
        )

        response = (
            supabase.table("ventas")
            .select("cliente_id, total, clientes(nombre, cuit)")
            .gte("fecha", desde_query.isoformat())
            .lt("fecha",  hasta_query.isoformat())
            .execute()
        )

        clientes = {}
        for venta in response.data:
            cliente = venta.get("clientes")
            if cliente:
                cid    = venta["cliente_id"]
                nombre = cliente.get("nombre", "Sin nombre")
                cuit   = cliente.get("cuit", "")
            else:
                cid    = "consumidor-final"
                nombre = "Consumidor Final"
                cuit   = ""

            if cid not in clientes:
                clientes[cid] = {
                    "cliente_id":   cid,
                    "nombre":       nombre,
                    "cuit":         cuit,
                    "cant_ventas":  0,
                    "total_ventas": 0,
                }
            clientes[cid]["cant_ventas"]  += 1
            clientes[cid]["total_ventas"] += float(venta["total"])

        return sorted(clientes.values(), key=lambda x: x["total_ventas"], reverse=True)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte: {str(e)}")


@router.get("/reportes/ventas-clientes/pdf")
async def reporte_ventas_clientes_pdf(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    try:
        from fastapi.responses import StreamingResponse
        import io
        from app.pdf_reportes import generar_pdf_reporte

        hoy = date.today()
        desde_query = desde or date(hoy.year, hoy.month, 1)
        hasta_query = hasta or (
            date(hoy.year + 1, 1, 1) if hoy.month == 12
            else date(hoy.year, hoy.month + 1, 1)
        )

        response = (
            supabase.table("ventas")
            .select("cliente_id, total, clientes(nombre, cuit)")
            .gte("fecha", desde_query.isoformat())
            .lt("fecha",  hasta_query.isoformat())
            .execute()
        )

        clientes = {}
        for venta in response.data:
            cliente = venta.get("clientes")
            if cliente:
                cid    = venta["cliente_id"]
                nombre = cliente.get("nombre", "Sin nombre")
                cuit   = cliente.get("cuit", "")
            else:
                cid    = "consumidor-final"
                nombre = "Consumidor Final"
                cuit   = ""
            if cid not in clientes:
                clientes[cid] = {
                    "cliente_id":   cid,
                    "nombre":       nombre,
                    "cuit":         cuit,
                    "cant_ventas":  0,
                    "total_ventas": 0,
                }
            clientes[cid]["cant_ventas"]  += 1
            clientes[cid]["total_ventas"] += float(venta["total"])

        datos = sorted(clientes.values(), key=lambda x: x["total_ventas"], reverse=True)
        filtros = {
            "desde": str(desde_query),
            "hasta": str(hasta_query),
        }
        pdf_bytes = generar_pdf_reporte("ventas-clientes", datos, filtros)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Reporte_Ventas_Clientes.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")


@router.get("/por-cliente/{cliente_id}", response_model=list[dict])
async def ventas_por_cliente(
    cliente_id: str,
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    try:
        q = (
            supabase.table("ventas")
            .select("id, total, fecha, observaciones, factura_id")
            .eq("cliente_id", cliente_id)
            .order("fecha", desc=True)
        )
        if desde: q = q.gte("fecha", desde.isoformat())
        if hasta: q = q.lte("fecha", hasta.isoformat())
        ventas = q.execute().data or []

        # Traer items de cada venta
        resultado = []
        for v in ventas:
            items_res = (
                supabase.table("ventas_items")
                .select("cantidad, precio_unitario, subtotal, productos(codigo, nombre)")
                .eq("venta_id", v["id"])
                .execute()
            )
            resultado.append({
                **v,
                "numero": f"V-{v['id'][:8].upper()}",
                "items": items_res.data or [],
            })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    

# ─── REGISTRAR VENTA + EMITIR FACTURA SIMULTÁNEAMENTE ────────────────────────

class ItemVentaFactura(BaseModel):
    producto_id:     str
    cantidad:        int
    precio_unitario: float
    descripcion:     Optional[str] = None

class VentaConFacturaCreate(BaseModel):
    cliente_id:    Optional[str] = None
    fecha:         Optional[str] = None
    observaciones: Optional[str] = None
    tipo_factura:  str = "B"          # "A" o "B"
    paga_contado:  bool = True
    items:         List[ItemVentaFactura]


@router.post("/con-factura", status_code=201)
async def registrar_venta_con_factura(datos: VentaConFacturaCreate):
    """
    Registra la venta Y emite la factura AFIP en un solo paso.
    El stock se descuenta una sola vez aquí.
    """
    from datetime import datetime as dt
    from app.afip_client import get_wsfe_client, get_auth, AFIP_PV, AFIP_MODO

    try:
        if not datos.items:
            raise HTTPException(status_code=400, detail="La venta debe tener al menos un producto")

        # PASO 1: Calcular total
        total    = round(sum(i.cantidad * i.precio_unitario for i in datos.items), 2)
        subtotal = total
        if datos.tipo_factura == "A":
            neto   = round(subtotal / 1.21, 2)
            iva_21 = round(neto * 0.21, 2)
        else:
            neto   = round(subtotal / 1.21, 2)
            iva_21 = round(neto * 0.21, 2)

        # PASO 2: Fecha
        fecha_venta = datos.fecha if datos.fecha else date.today().isoformat()

        # PASO 3: Crear cabecera de la venta
        venta_db = (
            supabase.table("ventas")
            .insert({
                "cliente_id":    datos.cliente_id,
                "fecha":         fecha_venta,
                "total":         total,
                "observaciones": datos.observaciones,
            })
            .execute()
        )
        venta_id     = venta_db.data[0]["id"]
        numero_venta = f"V-{venta_id[:8].upper()}"

        # PASO 4: Guardar ítems + descontar stock (UNA SOLA VEZ)
        for item in datos.items:
            prod = (
                supabase.table("productos")
                .select("id, nombre, stock_actual, activo")
                .eq("id", item.producto_id)
                .single()
                .execute()
            )
            if not prod.data:
                raise HTTPException(status_code=404,
                    detail=f"Producto {item.producto_id} no encontrado")
            if not prod.data["activo"]:
                raise HTTPException(status_code=400,
                    detail=f"El producto '{prod.data['nombre']}' está inactivo")
            if prod.data["stock_actual"] < item.cantidad:
                raise HTTPException(status_code=400,
                    detail=f"Stock insuficiente para '{prod.data['nombre']}'. "
                           f"Stock actual: {prod.data['stock_actual']}, "
                           f"solicitado: {item.cantidad}")

            subtotal_item = round(item.cantidad * item.precio_unitario, 2)

            supabase.table("ventas_items").insert({
                "venta_id":        venta_id,
                "producto_id":     item.producto_id,
                "cantidad":        item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal":        subtotal_item,
            }).execute()

            supabase.table("movimientos_stock").insert({
                "producto_id": item.producto_id,
                "tipo":        "salida",
                "cantidad":    item.cantidad,
                "motivo":      f"Venta con factura {numero_venta}",
            }).execute()

            nuevo_stock = prod.data["stock_actual"] - item.cantidad
            supabase.table("productos").update({
                "stock_actual": nuevo_stock
            }).eq("id", item.producto_id).execute()

        # PASO 5: Emitir factura AFIP
        auth      = get_auth()
        client    = get_wsfe_client()
        tipo_cbte = 1 if datos.tipo_factura == "A" else 6
        ultimo    = client.service.FECompUltimoAutorizado(
            Auth=auth, PtoVta=AFIP_PV, CbteTipo=tipo_cbte)
        numero_cbte = ultimo.CbteNro + 1
        fecha_hoy   = dt.now().strftime("%Y%m%d")

        # Datos receptor
        if datos.cliente_id:
            cliente_db = (
                supabase.table("clientes")
                .select("*")
                .eq("id", datos.cliente_id)
                .single()
                .execute()
            )
            cuit_str = cliente_db.data.get("cuit", "")
            if datos.tipo_factura == "A" and cuit_str:
                cuit_receptor = int(cuit_str.replace("-","").replace(" ",""))
                doc_tipo      = 80
            elif cuit_str:
                cuit_receptor = int(cuit_str.replace("-","").replace(" ",""))
                doc_tipo      = 80
            else:
                cuit_receptor = 0
                doc_tipo      = 99
        else:
            cuit_receptor = 0
            doc_tipo      = 99

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
                    "MonCotiz":   "1",
                    "Iva":        {"AlicIva": detalle_iva},
                }]
            }
        }

        resultado = client.service.FECAESolicitar(Auth=auth, FeCAEReq=comprobante)
        detalle   = resultado.FeDetResp.FECAEDetResponse[0]

        if detalle.Resultado != "A":
            errores = []
            try:
                if detalle.Observaciones:
                    for obs in detalle.Observaciones.Obs:
                        errores.append(f"{obs.Code}: {obs.Msg}")
            except Exception:
                pass
            raise HTTPException(status_code=400,
                detail=f"AFIP rechazó la factura: {errores if errores else str(detalle)}")

        cae        = detalle.CAE
        cae_vto    = detalle.CAEFchVto
        numero_str = f"{datos.tipo_factura}-{AFIP_PV:05d}-{numero_cbte:08d}"

        # PASO 6: Guardar factura en BD
        factura_db = (
            supabase.table("facturas")
            .insert({
                "numero":        numero_str,
                "tipo":          datos.tipo_factura,
                "cliente_id":    datos.cliente_id,
                "subtotal":      subtotal,
                "iva":           iva_21,
                "total":         total,
                "estado":        "emitida",
                "cae":           cae,
                "cae_vto":       cae_vto,
                "observaciones": datos.observaciones,
            })
            .execute()
        )
        factura_id = factura_db.data[0]["id"]

        # PASO 7: Guardar items factura
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

        # PASO 8: Vincular factura a la venta
        supabase.table("ventas").update({
            "factura_id": factura_id
        }).eq("id", venta_id).execute()

        # Nombre cliente
        nombre_cliente = "Consumidor Final"
        if datos.cliente_id:
            cli = (
                supabase.table("clientes")
                .select("nombre")
                .eq("id", datos.cliente_id)
                .single()
                .execute()
            )
            if cli.data:
                nombre_cliente = cli.data["nombre"]

        return {
            "ok":         True,
            "venta_id":   venta_id,
            "numero":     numero_venta,
            "factura_id": factura_id,
            "numero_factura": numero_str,
            "cliente":    nombre_cliente,
            "fecha":      fecha_venta,
            "total":      total,
            "items":      len(datos.items),
            "cae":        cae,
            "cae_vto":    cae_vto,
            "tipo":       datos.tipo_factura,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"Error al registrar venta con factura: {str(e)}")
    


# ─── PRESUPUESTOS ─────────────────────────────────────────────────────────────

class ItemPresupuesto(BaseModel):
    producto_id:     str
    cantidad:        int
    precio_unitario: float

class PresupuestoCreate(BaseModel):
    cliente_id:    Optional[str] = None
    fecha:         Optional[str] = None
    observaciones: Optional[str] = None
    validez_dias:  int = 15
    items:         List[ItemPresupuesto]


@router.post("/presupuestos", status_code=201)
async def crear_presupuesto(datos: PresupuestoCreate):
    try:
        if not datos.items:
            raise HTTPException(status_code=400,
                detail="El presupuesto debe tener al menos un producto")

        total       = round(sum(i.cantidad * i.precio_unitario for i in datos.items), 2)
        fecha_pres  = datos.fecha if datos.fecha else date.today().isoformat()

        pres_db = (
            supabase.table("presupuestos")
            .insert({
                "cliente_id":    datos.cliente_id,
                "fecha":         fecha_pres,
                "total":         total,
                "observaciones": datos.observaciones,
                "validez_dias":  datos.validez_dias,
            })
            .execute()
        )
        pres_id = pres_db.data[0]["id"]
        numero  = f"PRES-{pres_id[:8].upper()}"

        supabase.table("presupuesto_items").insert([
            {
                "presupuesto_id":  pres_id,
                "producto_id":     item.producto_id,
                "cantidad":        item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal":        round(item.cantidad * item.precio_unitario, 2),
            }
            for item in datos.items
        ]).execute()

        nombre_cliente = "Sin especificar"
        if datos.cliente_id:
            cli = (
                supabase.table("clientes")
                .select("nombre")
                .eq("id", datos.cliente_id)
                .single()
                .execute()
            )
            if cli.data:
                nombre_cliente = cli.data["nombre"]

        return {
            "ok":          True,
            "presupuesto_id": pres_id,
            "numero":      numero,
            "cliente":     nombre_cliente,
            "fecha":       fecha_pres,
            "total":       total,
            "items":       len(datos.items),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"Error al crear presupuesto: {str(e)}")



# ─── PDF DE PRESUPUESTO ───────────────────────────────────────────────────────

@router.get("/presupuestos/{presupuesto_id}/pdf")
async def pdf_presupuesto(presupuesto_id: str):
    try:
        from app.pdf_presupuesto import generar_pdf_presupuesto

        pres = (
            supabase.table("presupuestos")
            .select("*, clientes(nombre, cuit)")
            .eq("id", presupuesto_id)
            .single()
            .execute()
        )
        if not pres.data:
            raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

        items = (
            supabase.table("presupuesto_items")
            .select("*, productos(codigo, nombre)")
            .eq("presupuesto_id", presupuesto_id)
            .execute()
        )

        cliente = pres.data.get("clientes") or {}
        datos_pdf = {
            "numero":       f"PRES-{presupuesto_id[:8].upper()}",
            "fecha":        pres.data.get("fecha", ""),
            "validez_dias": pres.data.get("validez_dias", 15),
            "cliente": {
                "nombre": cliente.get("nombre", "Sin especificar"),
                "cuit":   cliente.get("cuit", ""),
            },
            "items": [
                {
                    "codigo":          (it.get("productos") or {}).get("codigo", ""),
                    "nombre":          (it.get("productos") or {}).get("nombre", ""),
                    "cantidad":        it.get("cantidad", 0),
                    "precio_unitario": float(it.get("precio_unitario", 0)),
                    "subtotal":        float(it.get("subtotal", 0)),
                }
                for it in (items.data or [])
            ],
            "total":         float(pres.data.get("total", 0)),
            "observaciones": pres.data.get("observaciones", "") or "",
        }

        pdf_bytes = generar_pdf_presupuesto(datos_pdf)
        nro = f"PRES-{presupuesto_id[:8].upper()}"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Presupuesto_{nro}.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"Error generando PDF de presupuesto: {str(e)}")
    

# ─── PDF DE VENTA ─────────────────────────────────────────────────────────────

@router.get("/venta/{venta_id}/pdf")
async def pdf_venta(venta_id: str):
    try:
        from app.pdf_venta import generar_pdf_venta

        venta = (
            supabase.table("ventas")
            .select("*, clientes(nombre, cuit)")
            .eq("id", venta_id)
            .single()
            .execute()
        )
        if not venta.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        items = (
            supabase.table("ventas_items")
            .select("*, productos(codigo, nombre)")
            .eq("venta_id", venta_id)
            .execute()
        )

        cliente = venta.data.get("clientes") or {}
        datos_pdf = {
            "numero":        f"V-{venta_id[:8].upper()}",
            "fecha":         venta.data.get("fecha", ""),
            "cliente": {
                "nombre": cliente.get("nombre", "Consumidor Final"),
                "cuit":   cliente.get("cuit", ""),
            },
            "items": [
                {
                    "codigo":          (it.get("productos") or {}).get("codigo", ""),
                    "nombre":          (it.get("productos") or {}).get("nombre", ""),
                    "cantidad":        it.get("cantidad", 0),
                    "precio_unitario": float(it.get("precio_unitario", 0)),
                    "subtotal":        float(it.get("subtotal", 0)),
                }
                for it in (items.data or [])
            ],
            "total":         float(venta.data.get("total", 0)),
            "observaciones": venta.data.get("observaciones", "") or "",
        }

        pdf_bytes = generar_pdf_venta(datos_pdf)
        nro = f"V-{venta_id[:8].upper()}"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Venta_{nro}.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"Error generando PDF de venta: {str(e)}")
    

# ─── DETALLE DE UNA VENTA ─────────────────────────────────────────────────────

@router.get("/{venta_id}", response_model=dict)
async def detalle_venta(venta_id: str):
    try:
        venta = (
            supabase.table("ventas")
            .select("*, clientes(nombre, cuit, telefono, email)")
            .eq("id", venta_id)
            .single()
            .execute()
        )
        if not venta.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        items = (
            supabase.table("ventas_items")
            .select("*, productos(codigo, nombre)")
            .eq("venta_id", venta_id)
            .execute()
        )
        return {**venta.data, "items": items.data or []}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener venta: {str(e)}")
