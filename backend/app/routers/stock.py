from fastapi import APIRouter, HTTPException
from uuid import UUID
from app.database import supabase
from app.schemas.stock import MovimientoCreate, MovimientoResponse
# Importamos los schemas desde su archivo separado en schemas/stock.py
# MovimientoCreate: valida los datos que manda el frontend al registrar un movimiento.
# MovimientoResponse: define exactamente qué devuelve la API después del movimiento.

# ─── CONFIGURACIÓN DEL ROUTER ─────────────────────────────────────────────────

router = APIRouter(
    prefix="/api/stock",
    # Todos los endpoints de este archivo arrancan con /api/stock.
    # Ejemplos:
    #   GET  /api/stock/criticos
    #   GET  /api/stock/{producto_id}/movimientos
    #   POST /api/stock/movimiento

    tags=["Stock"],
    # Agrupa estos endpoints bajo "Stock" en la documentación de /docs.
)

# ─── ENDPOINT 1: VER PRODUCTOS CON STOCK CRÍTICO ──────────────────────────────

@router.get("/criticos", response_model=list[dict])
# Este endpoint va ANTES que /{producto_id}/movimientos porque FastAPI lee
# las rutas en orden. Si pusieramos /{producto_id}/movimientos primero,
# FastAPI interpretaría "criticos" como un producto_id y fallaría.
# Regla general: las rutas fijas siempre antes que las rutas con parámetros.

async def productos_criticos():
    # Devuelve todos los productos donde stock_actual <= stock_minimo.
    # Es el endpoint que alimenta las alertas de reposición en la portada.
    # Responde al principal dolor de cabeza del cliente:
    # "no podemos reponer el stock a tiempo".
    try:
        response = (
            supabase.table("productos")
            .select("id, codigo, nombre, stock_actual, stock_minimo")
            # Solo traemos los 5 campos necesarios, no toda la tabla.
            # Esto hace la consulta más rápida y la respuesta más liviana.
            .eq("activo", True)
            # Solo productos activos — ignoramos los que fueron dados de baja.
            .execute()
        )

        criticos = [
            p for p in response.data
            if p["stock_actual"] <= p["stock_minimo"]
            # Filtramos en Python porque Supabase no soporta comparar
            # dos columnas entre sí directamente desde el cliente.
            # Ejemplo: stock_actual=5 y stock_minimo=20 → entra en la lista.
            # Ejemplo: stock_actual=50 y stock_minimo=20 → no entra.
        ]

        return criticos

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener stock crítico: {str(e)}"
        )

# ─── ENDPOINT 2: VER HISTORIAL DE MOVIMIENTOS DE UN PRODUCTO ──────────────────

@router.get("/{producto_id}/movimientos", response_model=list[MovimientoResponse])
# {producto_id}: parámetro dinámico en la URL.
# Ejemplo: GET /api/stock/550e8400-e29b-41d4-a716-446655440000/movimientos
# Devuelve todo el historial de entradas y salidas de ese producto.
# Útil para auditar qué pasó con el stock de un producto en particular.

async def listar_movimientos(producto_id: UUID):
    # producto_id: FastAPI extrae el UUID de la URL y lo valida automáticamente.
    try:
        response = (
            supabase.table("movimientos_stock")
            .select("*")
            .eq("producto_id", str(producto_id))
            # str(): convertimos el UUID a string porque Supabase lo espera así.
            # Filtra solo los movimientos que pertenecen a ese producto.
            .order("created_at", desc=True)
            # desc=True: ordena del movimiento más reciente al más antiguo.
            # Así el frontend siempre ve primero lo último que pasó.
            .execute()
        )

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al listar movimientos: {str(e)}"
        )

# ─── ENDPOINT 3: REGISTRAR UN MOVIMIENTO DE STOCK ─────────────────────────────

@router.post("/movimiento", response_model=MovimientoResponse, status_code=201)
# Este es el endpoint más importante del módulo de stock.
# Hace DOS operaciones en orden:
#   1. Registra el movimiento en la tabla movimientos_stock (historial).
#   2. Actualiza el stock_actual en la tabla productos (stock en tiempo real).
# Ambas operaciones deben ejecutarse siempre juntas — si una falla, el stock
# quedaría desincronizado. En una versión futura esto se puede envolver en
# una transacción de base de datos para garantizar consistencia total.

async def registrar_movimiento(movimiento: MovimientoCreate):
    try:
        # VALIDACIÓN 1: el tipo solo puede ser "entrada" o "salida"
        if movimiento.tipo not in ["entrada", "salida"]:
            raise HTTPException(
                status_code=400,
                detail="El tipo debe ser 'entrada' o 'salida'"
            )

        # VALIDACIÓN 2: la cantidad debe ser mayor a cero
        if movimiento.cantidad <= 0:
            raise HTTPException(
                status_code=400,
                detail="La cantidad debe ser mayor a 0"
            )

        # PASO 1: buscamos el producto para verificar que existe
        # y obtener su stock actual
        producto = (
            supabase.table("productos")
            .select("id, stock_actual, nombre, activo")
            # Solo traemos los campos que necesitamos
            .eq("id", str(movimiento.producto_id))
            .single()
            # .single(): esperamos exactamente un resultado
            .execute()
        )

        if not producto.data:
            raise HTTPException(
                status_code=404,
                detail="Producto no encontrado"
            )

        if not producto.data["activo"]:
            raise HTTPException(
                status_code=400,
                detail="No se puede mover stock de un producto inactivo"
            )

        stock_actual = producto.data["stock_actual"]
        # Guardamos el stock actual para calcular el nuevo valor

        # PASO 2: calculamos el nuevo stock según el tipo de movimiento
        if movimiento.tipo == "salida":
            if stock_actual < movimiento.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente. "
                           f"Stock actual: {stock_actual}, "
                           f"cantidad solicitada: {movimiento.cantidad}"
                )
                # Error claro para el operador: le dice exactamente
                # cuánto hay y cuánto se pidió.
            nuevo_stock = stock_actual - movimiento.cantidad
            # Restamos la cantidad saliente del stock actual

        else:
            # tipo == "entrada"
            nuevo_stock = stock_actual + movimiento.cantidad
            # Sumamos la cantidad entrante al stock actual

        # PASO 3: insertamos el movimiento en el historial
        nuevo_movimiento = {
            "producto_id": str(movimiento.producto_id),
            "tipo":        movimiento.tipo,
            "cantidad":    movimiento.cantidad,
            "motivo":      movimiento.motivo,
        }

        response_movimiento = (
            supabase.table("movimientos_stock")
            .insert(nuevo_movimiento)
            # INSERT INTO movimientos_stock (...) VALUES (...)
            .execute()
        )

        # PASO 4: actualizamos el stock_actual del producto
        supabase.table("productos").update(
            {"stock_actual": nuevo_stock}
            # UPDATE productos SET stock_actual = nuevo_stock
        ).eq("id", str(movimiento.producto_id)).execute()
        # WHERE id = producto_id — solo actualiza ESE producto

        return response_movimiento.data[0]
        # Devolvemos el movimiento recién creado con su id y created_at

    except HTTPException:
        raise
        # Re-lanzamos los HTTPException que creamos arriba sin modificarlos

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al registrar movimiento: {str(e)}"
        )