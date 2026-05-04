from fastapi import APIRouter, HTTPException
from uuid import UUID
from app.database import supabase
from app.schemas.categoria import CategoriaBase, CategoriaCreate, CategoriaResponse

# ─── ROUTER ───────────────────────────────────────────────────────────────────

router = APIRouter(
    prefix="/api/categorias",   # Todos los endpoints arrancan con /api/categorias
    tags=["Categorías"],        # Agrupación en la documentación /docs
)

# ─── ENDPOINT 1: LISTAR TODAS LAS CATEGORÍAS ──────────────────────────────────

@router.get("/", response_model=list[CategoriaResponse])
async def listar_categorias():
    try:
        response = (
            supabase.table("categorias")
            .select("*")           # Trae todas las columnas
            .order("nombre")       # Ordena alfabéticamente por nombre
            .execute()
        )
        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar categorías: {str(e)}")

# ─── ENDPOINT 2: OBTENER UNA CATEGORÍA POR ID ─────────────────────────────────

@router.get("/{categoria_id}", response_model=CategoriaResponse)
async def obtener_categoria(categoria_id: UUID):
    try:
        response = (
            supabase.table("categorias")
            .select("*")
            .eq("id", str(categoria_id))  # Filtra por el ID exacto
            .single()                      # Espera exactamente un resultado
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener categoría: {str(e)}")

# ─── ENDPOINT 3: CREAR UNA CATEGORÍA ──────────────────────────────────────────

@router.post("/", response_model=CategoriaResponse, status_code=201)
async def crear_categoria(categoria: CategoriaCreate):
    try:
        # Verificamos que no exista ya una categoría con el mismo nombre
        existente = (
            supabase.table("categorias")
            .select("id")
            .eq("nombre", categoria.nombre)
            .execute()
        )

        if existente.data:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe una categoría con el nombre '{categoria.nombre}'"
            )

        response = (
            supabase.table("categorias")
            .insert(categoria.model_dump())  # Convierte el schema a diccionario
            .execute()
        )

        return response.data[0]  # Devuelve el registro creado

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear categoría: {str(e)}")

# ─── ENDPOINT 4: ACTUALIZAR UNA CATEGORÍA ─────────────────────────────────────

@router.patch("/{categoria_id}", response_model=CategoriaResponse)
async def actualizar_categoria(categoria_id: UUID, datos: CategoriaBase):
    try:
        campos = datos.model_dump(exclude_none=True)
        # exclude_none=True: solo actualiza los campos que se mandaron

        if not campos:
            raise HTTPException(
                status_code=400,
                detail="Debés enviar al menos un campo para actualizar"
            )

        response = (
            supabase.table("categorias")
            .update(campos)
            .eq("id", str(categoria_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar categoría: {str(e)}")

# ─── ENDPOINT 5: ELIMINAR UNA CATEGORÍA ───────────────────────────────────────

@router.delete("/{categoria_id}", status_code=204)
async def eliminar_categoria(categoria_id: UUID):
    # A diferencia de productos, acá sí hacemos DELETE físico
    # porque las categorías no tienen referencias directas en facturas.
    # Si una categoría tiene productos asociados, Supabase lanzará error
    # por la restricción de clave foránea — eso es el comportamiento correcto.
    try:
        response = (
            supabase.table("categorias")
            .delete()                          # DELETE físico del registro
            .eq("id", str(categoria_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")

        return None  # 204 No Content — sin body en la respuesta

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar categoría: {str(e)}")