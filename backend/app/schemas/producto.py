from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

# Schema base con los campos comunes
class ProductoBase(BaseModel):
    codigo: str                    # Código alfanumérico del producto
    nombre: str                    # Nombre del producto
    descripcion: Optional[str]     # Descripción opcional
    categoria_id: Optional[UUID] = None   # ID de la categoría (opcional)
    precio: float                  # Precio de venta
    stock_minimo: int = 0          # Stock mínimo para alerta de reposición

# Schema para CREAR un producto (lo que manda el frontend)
class ProductoCreate(ProductoBase):
    stock_actual: int = 0          # Stock inicial al crear el producto

# Schema para ACTUALIZAR un producto (todos los campos son opcionales)
class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    stock_minimo: Optional[int] = None
    activo: Optional[bool] = None    

class CategoriaSimple(BaseModel):
    nombre: str

    class Config:
        from_attributes = True

# Schema para la RESPUESTA (lo que devuelve la API)
class ProductoResponse(ProductoBase):
    id: UUID                       # ID generado por Supabase
    stock_actual: int              # Stock actual del producto
    activo: bool                   # Si el producto está activo
    created_at: datetime           # Fecha de creación
    categorias: Optional[CategoriaSimple] = None  # ← agregar esta línea

    class Config:
        from_attributes = True     # Permite convertir objetos de BD a este schema