from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class CategoriaBase(BaseModel):
    nombre: str # Nombre de la categoría (ej: "Bulones zinc"
    descripcion: Optional[str] = None # Descripción opcional

class CategoriaCreate(CategoriaBase):
    pass
    # pass: no agrega campos nuevos, hereda todo de CategoriaBase.
    # Lo separamos igual para mantener consistencia con el resto del proyecto.
    # En el futuro si necesitamos campos solo al crear, los agregamos acá.

class CategoriaResponse(CategoriaBase):
    id: UUID # ID generado por Supabase
    created_at: datetime # Fecha de creación automática

    class Config:
        from_attributes = True # Permite convertir objetos de BD a este schema