# ============================================================
# routers/proveedores.py — CRUD completo de Proveedores
# Bulonera Miguel
# ============================================================

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.database import supabase
from app.schemas.proveedor import ProveedorCreate, ProveedorUpdate, ProveedorResponse

router = APIRouter(
    prefix="/api/proveedores",
    tags=["Proveedores"],
)

# ─── LISTAR ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ProveedorResponse])
async def listar_proveedores():
    try:
        response = (
            supabase.table("proveedores")
            .select("*")
            .order("nombre")
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar proveedores: {str(e)}")


# ─── BUSCAR ───────────────────────────────────────────────────────────────────

@router.get("/buscar", response_model=list[ProveedorResponse])
async def buscar_proveedores(q: str = Query(..., min_length=1)):
    try:
        response = (
            supabase.table("proveedores")
            .select("*")
            .ilike("nombre", f"%{q}%")
            .order("nombre")
            .limit(20)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar proveedores: {str(e)}")


# ─── OBTENER UNO ──────────────────────────────────────────────────────────────

@router.get("/{proveedor_id}", response_model=ProveedorResponse)
async def obtener_proveedor(proveedor_id: str):
    try:
        response = (
            supabase.table("proveedores")
            .select("*")
            .eq("id", proveedor_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener proveedor: {str(e)}")


# ─── CREAR ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=ProveedorResponse, status_code=201)
async def crear_proveedor(datos: ProveedorCreate):
    try:
        # Verificar que no exista un proveedor con el mismo nombre
        existente = (
            supabase.table("proveedores")
            .select("id")
            .ilike("nombre", datos.nombre)
            .execute()
        )
        if existente.data:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un proveedor con el nombre '{datos.nombre}'"
            )

        response = (
            supabase.table("proveedores")
            .insert(datos.model_dump())
            .execute()
        )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear proveedor: {str(e)}")


# ─── ACTUALIZAR ───────────────────────────────────────────────────────────────

@router.patch("/{proveedor_id}", response_model=ProveedorResponse)
async def actualizar_proveedor(proveedor_id: str, datos: ProveedorUpdate):
    try:
        campos = datos.model_dump(exclude_none=True)
        if not campos:
            raise HTTPException(
                status_code=400,
                detail="Debés enviar al menos un campo para actualizar"
            )

        response = (
            supabase.table("proveedores")
            .update(campos)
            .eq("id", proveedor_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar proveedor: {str(e)}")


# ─── ELIMINAR ─────────────────────────────────────────────────────────────────

@router.delete("/{proveedor_id}", status_code=204)
async def eliminar_proveedor(proveedor_id: str):
    try:
        response = (
            supabase.table("proveedores")
            .delete()
            .eq("id", proveedor_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar proveedor: {str(e)}")
