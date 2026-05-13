from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import date
from app.database import supabase

# ─── CONFIGURACIÓN DEL ROUTER ─────────────────────────────────────────────────

router = APIRouter(
    prefix="/api/reportes",
    tags=["Reportes"],
)

# Límite máximo de registros por reporte.
# Si el resultado supera este número, la API devuelve un error 400
# para que el frontend le pida al usuario que ajuste los filtros.
LIMITE_REGISTROS = 500

# ─── ENDPOINT 1: STOCK CRÍTICO ────────────────────────────────────────────────

@router.get("/stock-critico", response_model=list[dict])
async def reporte_stock_critico(
    nombre:       Optional[str]  = Query(None, description="Filtrar por nombre de producto"),
    codigo:       Optional[str]  = Query(None, description="Filtrar por código de producto"),
    categoria_id: Optional[str]  = Query(None, description="Filtrar por categoría"),
):
    """
    Devuelve todos los productos activos donde stock_actual <= stock_minimo.
    No filtra por fecha porque el stock crítico es siempre el estado actual.
    Permite filtrar por nombre, código y categoría.
    """
    try:
        query = (
            supabase.table("productos")
            .select("id, codigo, nombre, stock_actual, stock_minimo, precio, categoria_id")
            .eq("activo", True)
        )

        # Filtros opcionales
        if nombre:
            query = query.ilike("nombre", f"%{nombre}%")
            # ilike: búsqueda case-insensitive. "bulón" encuentra "Bulón" y "BULÓN".
        if codigo:
            query = query.ilike("codigo", f"%{codigo}%")
        if categoria_id:
            query = query.eq("categoria_id", categoria_id)

        response = query.execute()

        # Filtramos en Python porque Supabase no soporta comparar dos columnas entre sí
        criticos = [
            p for p in response.data
            if p["stock_actual"] <= p["stock_minimo"]
        ]

        # Ordenamos por diferencia entre stock actual y mínimo (los más críticos primero)
        criticos.sort(key=lambda p: p["stock_actual"] - p["stock_minimo"])

        if len(criticos) > LIMITE_REGISTROS:
            raise HTTPException(
                status_code=400,
                detail=f"El reporte devuelve {len(criticos)} registros, superando el límite de {LIMITE_REGISTROS}. "
                       f"Ajustá los filtros para reducir los resultados."
            )

        return criticos

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte stock crítico: {str(e)}")


# ─── ENDPOINT 2: PRODUCTOS MÁS VENDIDOS ───────────────────────────────────────

@router.get("/mas-vendidos", response_model=list[dict])
async def reporte_mas_vendidos(
    desde:        Optional[date] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    hasta:        Optional[date] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    nombre:       Optional[str]  = Query(None, description="Filtrar por nombre"),
    codigo:       Optional[str]  = Query(None, description="Filtrar por código"),
    categoria_id: Optional[str]  = Query(None, description="Filtrar por categoría"),
):
    """
    Devuelve los productos ordenados por total de unidades de SALIDA registradas
    en el período seleccionado. Considera solo movimientos de tipo 'salida'.
    """
    try:
        # Traemos los movimientos de tipo salida con datos del producto
        query = (
            supabase.table("movimientos_stock")
            .select("producto_id, cantidad, created_at, productos(id, codigo, nombre, precio, categoria_id, activo)")
            .eq("tipo", "salida")
        )

        if desde:
            query = query.gte("created_at", desde.isoformat())
            # gte: greater than or equal — fecha de inicio del período
        if hasta:
            # Incluimos todo el día 'hasta' sumando un día
            query = query.lte("created_at", f"{hasta.isoformat()}T23:59:59")

        response = query.execute()

        # Agrupamos por producto y sumamos cantidades en Python
        # Supabase free tier no soporta GROUP BY directamente desde el cliente
        totales = {}
        for mov in response.data:
            producto = mov.get("productos")
            if not producto or not producto.get("activo"):
                continue  # Ignoramos productos inactivos o sin datos

            pid = mov["producto_id"]

            # Aplicamos filtros de nombre, código y categoría sobre el producto
            if nombre and nombre.lower() not in producto["nombre"].lower():
                continue
            if codigo and codigo.lower() not in producto["codigo"].lower():
                continue
            if categoria_id and producto.get("categoria_id") != categoria_id:
                continue

            if pid not in totales:
                totales[pid] = {
                    "producto_id":  pid,
                    "codigo":       producto["codigo"],
                    "nombre":       producto["nombre"],
                    "precio":       producto["precio"],
                    "total_salidas": 0,
                    "cantidad_movimientos": 0,
                }
            totales[pid]["total_salidas"]         += mov["cantidad"]
            totales[pid]["cantidad_movimientos"]  += 1

        resultado = sorted(totales.values(), key=lambda x: x["total_salidas"], reverse=True)
        # reverse=True: de mayor a menor cantidad de salidas

        if len(resultado) > LIMITE_REGISTROS:
            raise HTTPException(
                status_code=400,
                detail=f"El reporte devuelve {len(resultado)} registros, superando el límite de {LIMITE_REGISTROS}. "
                       f"Ajustá los filtros para reducir los resultados."
            )

        return resultado

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte más vendidos: {str(e)}")


# ─── ENDPOINT 3: PRODUCTOS MENOS VENDIDOS ─────────────────────────────────────

@router.get("/menos-vendidos", response_model=list[dict])
async def reporte_menos_vendidos(
    desde:        Optional[date] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    hasta:        Optional[date] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    nombre:       Optional[str]  = Query(None, description="Filtrar por nombre"),
    codigo:       Optional[str]  = Query(None, description="Filtrar por código"),
    categoria_id: Optional[str]  = Query(None, description="Filtrar por categoría"),
):
    """
    Devuelve los productos activos con MENOS salidas en el período.
    Incluye también los productos sin ningún movimiento de salida en ese período,
    ya que son los que menos rotación tuvieron.
    """
    try:
        # Primero traemos todos los productos activos
        query_prod = supabase.table("productos").select("id, codigo, nombre, precio, categoria_id, stock_actual").eq("activo", True)

        if nombre:
            query_prod = query_prod.ilike("nombre", f"%{nombre}%")
        if codigo:
            query_prod = query_prod.ilike("codigo", f"%{codigo}%")
        if categoria_id:
            query_prod = query_prod.eq("categoria_id", categoria_id)

        todos_productos = query_prod.execute().data

        # Luego traemos los movimientos de salida en el período
        query_mov = (
            supabase.table("movimientos_stock")
            .select("producto_id, cantidad")
            .eq("tipo", "salida")
        )
        if desde:
            query_mov = query_mov.gte("created_at", desde.isoformat())
        if hasta:
            query_mov = query_mov.lte("created_at", f"{hasta.isoformat()}T23:59:59")

        movimientos = query_mov.execute().data

        # Construimos un dict de salidas por producto
        salidas_por_producto = {}
        for mov in movimientos:
            pid = mov["producto_id"]
            salidas_por_producto[pid] = salidas_por_producto.get(pid, 0) + mov["cantidad"]

        # Combinamos: productos con sus salidas (0 si no tuvieron ninguna)
        resultado = []
        for p in todos_productos:
            resultado.append({
                "producto_id":   p["id"],
                "codigo":        p["codigo"],
                "nombre":        p["nombre"],
                "precio":        p["precio"],
                "stock_actual":  p["stock_actual"],
                "total_salidas": salidas_por_producto.get(p["id"], 0),
            })

        # Ordenamos de menor a mayor salidas (los menos vendidos primero)
        resultado.sort(key=lambda x: x["total_salidas"])

        if len(resultado) > LIMITE_REGISTROS:
            raise HTTPException(
                status_code=400,
                detail=f"El reporte devuelve {len(resultado)} registros, superando el límite de {LIMITE_REGISTROS}. "
                       f"Ajustá los filtros para reducir los resultados."
            )

        return resultado

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte menos vendidos: {str(e)}")


# ─── ENDPOINT 4: INVENTARIO ACTUAL ────────────────────────────────────────────

@router.get("/inventario-actual", response_model=list[dict])
async def reporte_inventario_actual(
    nombre:       Optional[str]  = Query(None, description="Filtrar por nombre"),
    codigo:       Optional[str]  = Query(None, description="Filtrar por código"),
    categoria_id: Optional[str]  = Query(None, description="Filtrar por categoría"),
):
    """
    Devuelve el estado actual del inventario: todos los productos activos
    con su stock actual, mínimo, precio y valor total en stock.
    No filtra por fecha porque es siempre el estado en tiempo real.
    """
    try:
        query = (
            supabase.table("productos")
            .select("id, codigo, nombre, descripcion, precio, stock_actual, stock_minimo, categoria_id, created_at")
            .eq("activo", True)
            .order("nombre")
        )

        if nombre:
            query = query.ilike("nombre", f"%{nombre}%")
        if codigo:
            query = query.ilike("codigo", f"%{codigo}%")
        if categoria_id:
            query = query.eq("categoria_id", categoria_id)

        response = query.execute()

        # Calculamos el valor en stock (precio × stock_actual) para cada producto
        resultado = []
        for p in response.data:
            resultado.append({
                **p,
                "valor_en_stock": round(float(p["precio"]) * p["stock_actual"], 2),
                # valor_en_stock: cuánto dinero representa ese producto en el depósito.
                # Útil para que la bulonera conozca el capital inmovilizado en mercadería.
                "estado": "critico" if p["stock_actual"] <= p["stock_minimo"] else "normal",
            })

        if len(resultado) > LIMITE_REGISTROS:
            raise HTTPException(
                status_code=400,
                detail=f"El reporte devuelve {len(resultado)} registros, superando el límite de {LIMITE_REGISTROS}. "
                       f"Ajustá los filtros para reducir los resultados."
            )

        return resultado

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte inventario: {str(e)}")


# ─── ENDPOINT 5: PRODUCTOS DADOS DE BAJA ──────────────────────────────────────

@router.get("/productos-baja", response_model=list[dict])
async def reporte_productos_baja(
    desde:        Optional[date] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    hasta:        Optional[date] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    nombre:       Optional[str]  = Query(None, description="Filtrar por nombre"),
    codigo:       Optional[str]  = Query(None, description="Filtrar por código"),
    categoria_id: Optional[str]  = Query(None, description="Filtrar por categoría"),
):
    """
    Devuelve los productos con activo=False (dados de baja / desactivados).
    Filtra por updated_at para encontrar los dados de baja en el período.
    """
    try:
        query = (
            supabase.table("productos")
            .select("id, codigo, nombre, precio, stock_actual, stock_minimo, categoria_id, updated_at")
            .eq("activo", False)
            .order("updated_at", desc=True)
            # Ordenamos por fecha de baja más reciente primero
        )

        if desde:
            query = query.gte("updated_at", desde.isoformat())
        if hasta:
            query = query.lte("updated_at", f"{hasta.isoformat()}T23:59:59")
        if nombre:
            query = query.ilike("nombre", f"%{nombre}%")
        if codigo:
            query = query.ilike("codigo", f"%{codigo}%")
        if categoria_id:
            query = query.eq("categoria_id", categoria_id)

        response = query.execute()

        if len(response.data) > LIMITE_REGISTROS:
            raise HTTPException(
                status_code=400,
                detail=f"El reporte devuelve {len(response.data)} registros, superando el límite de {LIMITE_REGISTROS}. "
                       f"Ajustá los filtros para reducir los resultados."
            )

        return response.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte productos baja: {str(e)}")
