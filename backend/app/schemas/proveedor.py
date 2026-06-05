# ============================================================
# schemas/proveedor.py — Schemas Pydantic para Proveedores
# ============================================================

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProveedorBase(BaseModel):
    nombre:    str
    cuit:      Optional[str] = None
    direccion: Optional[str] = None
    telefono:  Optional[str] = None
    email:     Optional[str] = None


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre:    Optional[str] = None
    cuit:      Optional[str] = None
    direccion: Optional[str] = None
    telefono:  Optional[str] = None
    email:     Optional[str] = None


class ProveedorResponse(ProveedorBase):
    id:         str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
