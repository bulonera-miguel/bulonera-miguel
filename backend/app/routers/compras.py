# ============================================================
# routers/compras.py — Registro de compras a proveedores
# Bulonera Miguel
#
# Cuando se registra una compra:
#   1. Se guarda en compras_proveedores (cabecera)
#   2. Se guardan los ítems en compras_items
#   3. Se registra un movimiento de ENTRADA en movimientos_stock
#   4. Se actualiza el stock_actual de cada producto
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
    prefix="/api/compras",
    tags=["Compras"],
)

# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class ItemCompra(BaseModel):
    producto_id:     str
    cantidad:        int
    precio_unitario: float

class CompraCreate(BaseModel):
    proveedor_id:  str
    fecha:         Optional[str] = None   # "YYYY-MM-DD" — si no se manda usa hoy
    observaciones: Optional[str] = None
    items:         List[ItemCompra]


# ─── LISTAR COMPRAS ───────────────────────────────────────────────────────────

@router.get("/", response_model=list[dict])
async def listar_compras(
    proveedor_id: Optional[str] = Query(None),
    desde:        Optional[date] = Query(None),
    hasta:        Optional[date] = Query(None),
):
    """
    Devuelve el listado de compras con datos del proveedor.
    Permite filtrar por proveedor y rango de fechas.
    """
    try:
        query = (
            supabase.table("compras_proveedores")
            .select("*, proveedores(nombre, cuit)")
            .order("fecha", desc=True)
            .order("created_at", desc=True)
        )
        if proveedor_id:
            query = query.eq("proveedor_id", proveedor_id)
        if desde:
            query = query.gte("fecha", desde.isoformat())
        if hasta:
            query = query.lte("fecha", hasta.isoformat())

        response = query.limit(200).execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar compras: {str(e)}")


# ─── DETALLE DE UNA COMPRA ────────────────────────────────────────────────────

@router.get("/{compra_id}", response_model=dict)
async def detalle_compra(compra_id: str):
    """Devuelve la cabecera + ítems de una compra."""
    try:
        compra = (
            supabase.table("compras_proveedores")
            .select("*, proveedores(nombre, cuit, telefono, email)")
            .eq("id", compra_id)
            .single()
            .execute()
        )
        if not compra.data:
            raise HTTPException(status_code=404, detail="Compra no encontrada")

        items = (
            supabase.table("compras_items")
            .select("*, productos(codigo, nombre)")
            .eq("compra_id", compra_id)
            .execute()
        )
        return {**compra.data, "items": items.data or []}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener compra: {str(e)}")


# ─── REGISTRAR COMPRA ─────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def registrar_compra(datos: CompraCreate):
    """
    Registra una compra a un proveedor y actualiza el stock automáticamente.
    """
    try:
        if not datos.items:
            raise HTTPException(status_code=400, detail="La compra debe tener al menos un producto")

        # PASO 1: Verificar que el proveedor existe
        prov = (
            supabase.table("proveedores")
            .select("id, nombre")
            .eq("id", datos.proveedor_id)
            .single()
            .execute()
        )
        if not prov.data:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")

        # PASO 2: Calcular total
        total = round(sum(i.cantidad * i.precio_unitario for i in datos.items), 2)

        # PASO 3: Fecha — usar la enviada o la de hoy
        fecha_compra = datos.fecha if datos.fecha else date.today().isoformat()

        # PASO 4: Crear cabecera de la compra
        compra_db = (
            supabase.table("compras_proveedores")
            .insert({
                "proveedor_id":  datos.proveedor_id,
                "fecha":         fecha_compra,
                "total":         total,
                "observaciones": datos.observaciones,
            })
            .execute()
        )
        compra_id = compra_db.data[0]["id"]
        numero_compra = f"C-{compra_id[:8].upper()}"

        # PASO 5: Guardar ítems + actualizar stock de cada producto
        for item in datos.items:

            # Verificar que el producto existe y está activo
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

            subtotal = round(item.cantidad * item.precio_unitario, 2)

            # Guardar ítem de compra
            supabase.table("compras_items").insert({
                "compra_id":       compra_id,
                "producto_id":     item.producto_id,
                "cantidad":        item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal":        subtotal,
            }).execute()

            # Registrar movimiento de ENTRADA en historial de stock
            supabase.table("movimientos_stock").insert({
                "producto_id": item.producto_id,
                "tipo":        "entrada",
                "cantidad":    item.cantidad,
                "motivo":      f"Compra {numero_compra} - {prov.data['nombre']}",
            }).execute()

            # Actualizar stock_actual del producto
            nuevo_stock = prod.data["stock_actual"] + item.cantidad
            supabase.table("productos").update({
                "stock_actual": nuevo_stock
            }).eq("id", item.producto_id).execute()

        return {
            "ok":       True,
            "compra_id": compra_id,
            "numero":   numero_compra,
            "proveedor": prov.data["nombre"],
            "fecha":    fecha_compra,
            "total":    total,
            "items":    len(datos.items),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar compra: {str(e)}")


# ─── REPORTE DEUDA POR PROVEEDOR POR MES ─────────────────────────────────────

@router.get("/reportes/deuda-mensual", response_model=list[dict])
async def reporte_deuda_mensual(
    desde:  Optional[date] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    hasta:  Optional[date] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    nombre: Optional[str]  = Query(None, description="Filtrar por nombre de proveedor"),
):
    try:
        hoy = date.today()
        desde_query = desde or date(hoy.year, hoy.month, 1)
        hasta_query = hasta or (
            date(hoy.year + 1, 1, 1) if hoy.month == 12
            else date(hoy.year, hoy.month + 1, 1)
        )

        response = (
            supabase.table("compras_proveedores")
            .select("proveedor_id, total, proveedores(nombre, cuit)")
            .gte("fecha", desde_query.isoformat())
            .lt("fecha", hasta_query.isoformat())
            .execute()
        )

        proveedores = {}
        for compra in response.data:
            pid         = compra["proveedor_id"]
            prov_data   = compra.get("proveedores") or {}
            prov_nombre = prov_data.get("nombre", "Desconocido")
            prov_cuit   = prov_data.get("cuit", "")
            if pid not in proveedores:
                proveedores[pid] = {
                    "proveedor_id":   pid,
                    "nombre":         prov_nombre,
                    "cuit":           prov_cuit,
                    "total_comprado": 0,
                    "cant_compras":   0,
                }
            proveedores[pid]["total_comprado"] += float(compra["total"])
            proveedores[pid]["cant_compras"]   += 1

        resultado = sorted(
            proveedores.values(),
            key=lambda x: x["total_comprado"],
            reverse=True,
        )

        if nombre:
            resultado = [p for p in resultado if nombre.lower() in p["nombre"].lower()]

        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte: {str(e)}")



@router.get("/reportes/deuda-mensual/pdf")
async def reporte_compras_proveedor_pdf(
    desde:  Optional[date] = Query(None),
    hasta:  Optional[date] = Query(None),
    nombre: Optional[str]  = Query(None),
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
            supabase.table("compras_proveedores")
            .select("proveedor_id, total, proveedores(nombre, cuit)")
            .gte("fecha", desde_query.isoformat())
            .lt("fecha",  hasta_query.isoformat())
            .execute()
        )

        proveedores = {}
        for compra in response.data:
            pid         = compra["proveedor_id"]
            prov_data   = compra.get("proveedores") or {}
            prov_nombre = prov_data.get("nombre", "Desconocido")
            prov_cuit   = prov_data.get("cuit", "")
            if pid not in proveedores:
                proveedores[pid] = {
                    "proveedor_id":   pid,
                    "nombre":         prov_nombre,
                    "cuit":           prov_cuit,
                    "total_comprado": 0,
                    "cant_compras":   0,
                }
            proveedores[pid]["total_comprado"] += float(compra["total"])
            proveedores[pid]["cant_compras"]   += 1

        datos = sorted(proveedores.values(), key=lambda x: x["total_comprado"], reverse=True)
        if nombre:
            datos = [p for p in datos if nombre.lower() in p["nombre"].lower()]

        filtros = {
            "desde": str(desde_query),
            "hasta": str(hasta_query),
            "nombre": nombre or "",
        }
        pdf_bytes = generar_pdf_reporte("compras-proveedor", datos, filtros)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Reporte_Compras_Proveedor.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
    

@router.get("/por-proveedor/{proveedor_id}", response_model=list[dict])
async def compras_por_proveedor(
    proveedor_id: str,
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    try:
        q = (
            supabase.table("compras_proveedores")
            .select("id, total, fecha, observaciones")
            .eq("proveedor_id", proveedor_id)
            .order("fecha", desc=True)
        )
        if desde: q = q.gte("fecha", desde.isoformat())
        if hasta: q = q.lte("fecha", hasta.isoformat())
        compras = q.execute().data or []

        resultado = []
        for c in compras:
            items_res = (
                supabase.table("compras_items")
                .select("cantidad, precio_unitario, subtotal, productos(codigo, nombre)")
                .eq("compra_id", c["id"])
                .execute()
            )
            resultado.append({
                **c,
                "numero": f"C-{c['id'][:8].upper()}",
                "items": items_res.data or [],
            })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")