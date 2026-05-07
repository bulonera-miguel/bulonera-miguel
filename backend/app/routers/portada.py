from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(
    prefix="/api/portada",
    tags=["Portada"],
)

# ─── ENDPOINT PRINCIPAL: RESUMEN DE LA PORTADA ────────────────

@router.get("/resumen")
async def resumen_portada():
    # Este endpoint devuelve todos los datos que necesita la portada
    # en una sola llamada — evita que el frontend haga 4 o 5 requests separados.
    try:

        # ── 1. TOTAL DE PRODUCTOS ACTIVOS ──────────────────────
        total_resp = (
            supabase.table("productos")
            .select("id", count="exact")
            # count="exact": le pedimos a Supabase que cuente los registros
            # sin traer todos los datos — es mucho más eficiente.
            .eq("activo", True)
            .execute()
        )
        total_productos = total_resp.count or 0

        # ── 2. TODOS LOS PRODUCTOS ACTIVOS (para calcular críticos) ──
        productos_resp = (
            supabase.table("productos")
            .select("id, codigo, nombre, stock_actual, stock_minimo, precio, created_at")
            .eq("activo", True)
            .execute()
        )
        productos = productos_resp.data or []

        # ── 3. STOCK CRÍTICO ───────────────────────────────────
        # Productos donde stock_actual <= stock_minimo
        criticos = [p for p in productos if p["stock_actual"] <= p["stock_minimo"]]
        # Ordenamos por diferencia entre stock_actual y stock_minimo
        # El más crítico es el que tiene mayor déficit
        criticos.sort(key=lambda p: p["stock_actual"] - p["stock_minimo"])
        producto_critico = criticos[0] if criticos else None

        # ── 4. MÁS VENDIDO ─────────────────────────────────────
        # Contamos movimientos de salida por producto
        salidas_resp = (
            supabase.table("movimientos_stock")
            .select("producto_id, cantidad")
            .eq("tipo", "salida")
            .execute()
        )
        salidas = salidas_resp.data or []

        # Sumamos las cantidades por producto_id
        ventas_por_producto = {}
        for s in salidas:
            pid = s["producto_id"]
            ventas_por_producto[pid] = ventas_por_producto.get(pid, 0) + s["cantidad"]

        producto_mas_vendido = None
        producto_menos_vendido = None

        if ventas_por_producto:
            # ID del producto con más salidas
            id_mas_vendido = max(ventas_por_producto, key=ventas_por_producto.get)
            # ID del producto con menos salidas
            id_menos_vendido = min(ventas_por_producto, key=ventas_por_producto.get)

            # Buscamos los datos completos en la lista de productos
            producto_mas_vendido = next(
                (p for p in productos if p["id"] == id_mas_vendido), None
            )
            producto_menos_vendido = next(
                (p for p in productos if p["id"] == id_menos_vendido), None
            )

        # ── 5. MÁS RECIENTE ────────────────────────────────────
        # Ordenamos por created_at descendente y tomamos el primero
        productos_por_fecha = sorted(
            productos,
            key=lambda p: p["created_at"],
            reverse=True
            # reverse=True: del más nuevo al más viejo
        )
        producto_mas_reciente = productos_por_fecha[0] if productos_por_fecha else None

        # ── 6. MAYOR PRECIO ────────────────────────────────────
        producto_mayor_precio = max(
            productos, key=lambda p: p["precio"]
        ) if productos else None

        # ── 7. MAYOR STOCK ─────────────────────────────────────
        producto_mayor_stock = max(
            productos, key=lambda p: p["stock_actual"]
        ) if productos else None

        # ── RESPUESTA FINAL ────────────────────────────────────
        return {
            "kpis": {
                "total_productos": total_productos,
                "alertas_criticas": len(criticos),
            },
            "vistas": {
                "stock_critico":      producto_critico,
                "mas_vendido":        producto_mas_vendido,
                "menos_vendido":      producto_menos_vendido,
                "mas_reciente":       producto_mas_reciente,
                "mayor_precio":       producto_mayor_precio,
                "mayor_stock":        producto_mayor_stock,
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener resumen de portada: {str(e)}"
        )