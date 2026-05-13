from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import supabase
import os

router = APIRouter(
    prefix="/api/usuarios",
    tags=["Usuarios"],
)

# ── SCHEMAS ───────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    nombre: str
    email:  EmailStr
    password: str
    rol:    str = "vendedor"

class UsuarioUpdate(BaseModel):
    nombre:   Optional[str] = None
    rol:      Optional[str] = None
    password: Optional[str] = None
    activo:   Optional[bool] = None

# ── ENDPOINT 1: LISTAR USUARIOS ───────────────────────────────────────────────

@router.get("/", response_model=list[dict])
async def listar_usuarios():
    try:
        response = supabase.table("usuarios").select("*").order("nombre").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── ENDPOINT 2: CREAR USUARIO ─────────────────────────────────────────────────

@router.post("/", status_code=201)
async def crear_usuario(datos: UsuarioCreate):
    try:
        # 1. Crear en Supabase Auth usando la service_role key del backend
        auth_response = supabase.auth.admin.create_user({
            "email":            datos.email,
            "password":         datos.password,
            "email_confirm":    True,
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Error al crear usuario en Auth")

        user_id = auth_response.user.id

        # 2. Insertar en tabla usuarios
        db_response = supabase.table("usuarios").insert({
            "id":     user_id,
            "nombre": datos.nombre,
            "email":  datos.email,
            "rol":    datos.rol,
            "activo": True,
        }).execute()

        return db_response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── ENDPOINT 3: ACTUALIZAR USUARIO ────────────────────────────────────────────

@router.patch("/{usuario_id}")
async def actualizar_usuario(usuario_id: str, datos: UsuarioUpdate):
    try:
        # Actualizar en tabla usuarios
        update_data = {}
        if datos.nombre is not None: update_data["nombre"] = datos.nombre
        if datos.rol    is not None: update_data["rol"]    = datos.rol
        if datos.activo is not None: update_data["activo"] = datos.activo

        if update_data:
            supabase.table("usuarios").update(update_data).eq("id", usuario_id).execute()

        # Si cambió la contraseña, actualizar en Auth
        if datos.password:
            supabase.auth.admin.update_user_by_id(
                usuario_id,
                {"password": datos.password}
            )

        return {"ok": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))