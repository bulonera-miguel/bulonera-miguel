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