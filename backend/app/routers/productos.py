# app/routers/productos.py

# ─── IMPORTACIONES ────────────────────────────────────────────────────────────

from fastapi import APIRouter, HTTPException, Query
# APIRouter: es el "mini-router" de FastAPI. No usamos app directamente acá,
#            sino un router que luego se "incluye" en main.py con include_router().
# HTTPException: sirve para devolver errores HTTP con código y mensaje personalizado.
#                Ejemplo: HTTPException(status_code=404, detail="No encontrado")
# Query: permite declarar parámetros de query string opcionales en la URL.
#        Ejemplo: GET /api/productos/?activo=true  →  activo sería un Query param.

from typing import Optional
# Optional: indica que un parámetro puede ser None (o sea, no es obligatorio).
# Ejemplo: Optional[bool] significa que puede ser True, False, o directamente None.

from uuid import UUID
# UUID: el tipo de dato del ID que Supabase genera automáticamente para cada registro.
# Ejemplo de UUID: "550e8400-e29b-41d4-a716-446655440000"
# FastAPI valida automáticamente que el ID recibido tenga formato UUID correcto.

from app.database import supabase
# Importamos el cliente de Supabase configurado en app/database.py.
# Este objeto "supabase" es el que se comunica con la base de datos en la nube.
# Usamos "app.database" (con prefijo app.) porque main.py está fuera de la carpeta app/.

from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse
# Importamos los tres schemas Pydantic definidos en app/schemas/producto.py:
# - ProductoCreate:  valida los datos al CREAR un producto (lo que manda el frontend).
# - ProductoUpdate:  valida los datos al ACTUALIZAR (todos los campos son opcionales).
# - ProductoResponse: define exactamente lo que la API DEVUELVE al frontend.
# Usamos "app.schemas.producto" (con prefijo app.) por el mismo motivo que arriba.


# ─── CONFIGURACIÓN DEL ROUTER ─────────────────────────────────────────────────

router = APIRouter(
    prefix="/api/productos",
    # prefix: todos los endpoints de este archivo arrancan con /api/productos.
    # Ejemplo: @router.get("/")       → accesible en GET /api/productos/
    # Ejemplo: @router.get("/{id}")   → accesible en GET /api/productos/550e8400-...

    tags=["Productos"],
    # tags: agrupa estos endpoints bajo la etiqueta "Productos" en la documentación
    # automática de FastAPI, visible en http://localhost:8000/docs
)


# ─── ENDPOINT 1: LISTAR TODOS LOS PRODUCTOS ───────────────────────────────────

@router.get("/", response_model=list[ProductoResponse])
# @router.get("/"): escucha peticiones GET en /api/productos/
# response_model: le dice a FastAPI que la respuesta es una LISTA de ProductoResponse.
#                 FastAPI valida y filtra los datos automáticamente antes de devolver.
#                 Si Supabase devuelve campos extra, FastAPI los ignora.

async def listar_productos(
    activo: Optional[bool] = Query(default=None),
    # activo: parámetro de query string opcional.
    # GET /api/productos/?activo=true  → devuelve solo los productos activos.
    # GET /api/productos/?activo=false → devuelve solo los inactivos.
    # GET /api/productos/              → devuelve todos (activo=None por defecto).

    categoria_id: Optional[UUID] = Query(default=None),
    # categoria_id: otro filtro opcional por categoría.
    # GET /api/productos/?categoria_id=uuid-aqui → filtra por esa categoría.
    # Útil para el buscador por tipo de producto (bulones, tuercas, llaves, etc.).
):
    try:
        query = supabase.table("productos").select("*")
        # supabase.table("productos"): apunta a la tabla "productos" en Supabase.
        # .select("*"): trae TODAS las columnas. Equivale a SELECT * FROM productos.
        # Todavía no ejecutamos la consulta, solo la vamos construyendo.

        if activo is not None:
            query = query.eq("activo", activo)
            # .eq("activo", activo): agrega un filtro WHERE activo = true/false.
            # Solo se aplica si el frontend mandó el parámetro activo en la URL.

        if categoria_id is not None:
            query = query.eq("categoria_id", str(categoria_id))
            # str(categoria_id): convertimos el UUID a string porque Supabase
            # espera el valor como string en el filtro, aunque la columna sea UUID.

        response = query.execute()
        # .execute(): recién acá lanzamos la consulta a Supabase y obtenemos resultados.

        return response.data
        # response.data: lista de diccionarios con los productos encontrados.
        # FastAPI los convierte automáticamente al formato ProductoResponse.

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar productos: {str(e)}")
        # Si algo falla (conexión caída, error de Supabase, etc.),
        # devolvemos un error 500 (Internal Server Error) con el mensaje del error.


# ─── ENDPOINT 2: OBTENER UN PRODUCTO POR ID ───────────────────────────────────

@router.get("/{producto_id}", response_model=ProductoResponse)
# {producto_id}: parámetro de ruta dinámica.
# GET /api/productos/550e8400-e29b-41d4-a716-446655440000 → trae ese producto.
# response_model: devuelve un solo ProductoResponse (no una lista).

async def obtener_producto(producto_id: UUID):
    # producto_id: FastAPI extrae el UUID de la URL y lo valida automáticamente.
    # Si la URL tiene un valor que no es UUID válido → FastAPI devuelve 422 solo.

    try:
        response = (
            supabase.table("productos")
            .select("*")
            .eq("id", str(producto_id))
            # Filtramos por el ID exacto. str() porque Supabase espera string.
            .single()
            # .single(): le indica a Supabase que esperamos exactamente UN resultado.
            # Si no existe ningún registro con ese ID, Supabase lanza una excepción.
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
            # 404 Not Found: el estándar HTTP para "existe el endpoint pero no el recurso".

        return response.data

    except HTTPException:
        raise
        # Re-lanzamos el 404 que creamos arriba sin modificarlo.
        # Sin esta línea, el except Exception de abajo lo capturaría y lo pierde.

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener producto: {str(e)}")


# ─── ENDPOINT 3: CREAR UN PRODUCTO ────────────────────────────────────────────

@router.post("/", response_model=ProductoResponse, status_code=201)
# @router.post("/"): escucha peticiones POST en /api/productos/
# status_code=201: cuando se crea algo exitosamente, el estándar HTTP es 201 Created,
#                  no 200 OK. Es buena práctica diferenciarlo para que el frontend sepa
#                  que se creó un recurso nuevo y no solo se procesó una consulta.

async def crear_producto(producto: ProductoCreate):
    # producto: FastAPI toma el JSON que manda el frontend, lo valida contra
    # ProductoCreate (todos los campos requeridos deben estar y con tipos correctos).
    # Si falla la validación (falta un campo, tipo incorrecto, etc.) → 422 automático.

    try:
        existente = (
            supabase.table("productos")
            .select("id")
            .eq("codigo", producto.codigo)
            .execute()
        )
        # Verificamos que no exista ya un producto con ese código.
        # Solo traemos el "id" porque es lo único que necesitamos para saber si existe.
        # Traer toda la fila sería innecesario y más lento.

        if existente.data:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un producto con el código '{producto.codigo}'"
            )
            # 400 Bad Request: el cliente mandó datos inválidos (código duplicado).
            # Importante para el negocio: cada bulón tiene un código único alfanumérico.

        nuevo_producto = producto.model_dump()
        # .model_dump(): convierte el objeto Pydantic a un diccionario Python plano.
        # Resultado: {"codigo": "BUL-001", "nombre": "Bulón M6", "precio": 150.0, ...}
        # Esto es exactamente lo que Supabase necesita para insertar en la tabla.

        response = supabase.table("productos").insert(nuevo_producto).execute()
        # .insert(dict): ejecuta INSERT INTO productos (columnas) VALUES (valores).
        # Supabase devuelve el registro insertado completo, incluyendo el id y
        # el created_at que generó automáticamente.

        return response.data[0]
        # response.data es una lista con el/los registros insertados.
        # Tomamos el primero [0] porque insertamos uno solo.

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")


# ─── ENDPOINT 4: ACTUALIZAR UN PRODUCTO ───────────────────────────────────────

@router.patch("/{producto_id}", response_model=ProductoResponse)
# PATCH en lugar de PUT: usamos PATCH porque actualizamos PARCIALMENTE.
# La diferencia clave:
#   PUT   → reemplaza el objeto completo (hay que mandar TODOS los campos).
#   PATCH → actualiza solo los campos que se mandan, el resto queda igual.
# Esto es perfecto para nuestro caso porque ProductoUpdate tiene todos los campos
# como Optional, o sea que el frontend puede mandar solo lo que quiere cambiar.

async def actualizar_producto(producto_id: UUID, datos: ProductoUpdate):
    # datos: el frontend puede mandar solo {"precio": 200.0} y únicamente
    # se actualiza el precio. Los demás campos quedan exactamente igual en la BD.

    try:
        campos_a_actualizar = datos.model_dump(exclude_none=True)
        # exclude_none=True: excluye del diccionario los campos que son None.
        # Si el frontend mandó {"precio": 200.0, "nombre": null},
        # esto devuelve solo {"precio": 200.0}, sin tocar el nombre en la BD.
        # Sin este parámetro, Supabase pisaría los campos con null.

        if not campos_a_actualizar:
            raise HTTPException(
                status_code=400,
                detail="Debés enviar al menos un campo para actualizar"
            )
            # Si el frontend mandó un body vacío o con todo null, no hay nada que hacer.
            # Devolvemos 400 antes de hacer una consulta inútil a la base de datos.

        response = (
            supabase.table("productos")
            .update(campos_a_actualizar)
            # .update(dict): ejecuta UPDATE productos SET campo=valor, ...
            .eq("id", str(producto_id))
            # WHERE id = producto_id → solo actualiza ESE producto.
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar producto: {str(e)}")


# ─── ENDPOINT 5: ELIMINAR UN PRODUCTO (SOFT DELETE) ───────────────────────────

@router.delete("/{producto_id}", status_code=204)
# status_code=204: No Content. El estándar HTTP para eliminaciones exitosas.
# No devolvemos body en la respuesta, solo confirmamos que se procesó correctamente.
# Por eso NO usamos response_model: 204 por definición no tiene cuerpo de respuesta.

async def eliminar_producto(producto_id: UUID):
    # SOFT DELETE (eliminación lógica): no borramos el registro de la base de datos.
    # Solo cambiamos el campo activo a False. Esto es fundamental porque:
    # 1. Preserva el historial: las ventas/facturas ya emitidas referencian este producto.
    #    Si lo borramos físicamente, esas referencias quedan rotas.
    # 2. Permite reactivarlo: si fue un error, se puede volver a poner activo=True.
    # 3. Auditoría: siempre sabemos qué productos existieron en el negocio.

    try:
        response = (
            supabase.table("productos")
            .update({"activo": False})
            # Solo actualizamos el campo activo a False.
            # Todos los demás datos del producto se conservan intactos.
            .eq("id", str(producto_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        return None
        # Devolvemos None explícitamente.
        # Con status_code=204, FastAPI no incluye body en la respuesta HTTP,
        # que es exactamente el comportamiento correcto para un DELETE exitoso.

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar producto: {str(e)}")