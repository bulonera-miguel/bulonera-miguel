from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

# Schema base para crear un movimiento de stock
class MovimientoCreate(BaseModel):
    producto_id: UUID
    # ID del producto al que se le registra el movimiento.
    # Es UUID porque así lo genera Supabase automáticamente.

    tipo: str
    # Tipo de movimiento. Solo acepta dos valores: "entrada" o "salida".
    # - "entrada": cuando llega mercadería de un proveedor o se repone stock.
    # - "salida": cuando se vende un producto o se descuenta por factura.

    cantidad: int
    # Cantidad de unidades a mover. Siempre es un número positivo.
    # El router se encarga de sumar o restar según el tipo.

    motivo: Optional[str] = None
    # Descripción opcional del movimiento.
    # Ejemplos: "Compra a proveedor", "Venta factura 0001", "Ajuste de inventario".

# Schema para la respuesta que devuelve la API
class MovimientoResponse(BaseModel):
    id: UUID
    # ID único del movimiento generado por Supabase.

    producto_id: UUID
    # ID del producto al que pertenece este movimiento.

    tipo: str
    # "entrada" o "salida" — el mismo valor que se mandó al crear.

    cantidad: int
    # Cantidad movida.

    motivo: Optional[str] = None
    # Motivo del movimiento si se proporcionó.

    factura_id: Optional[UUID] = None
    # ID de la factura que generó este movimiento.
    # Es None cuando el movimiento se hace manualmente (no por una venta).
    # Se llena automáticamente cuando el movimiento viene de una factura.

    usuario_id: Optional[UUID] = None
    # ID del usuario que registró el movimiento.
    # Por ahora es None — se completará cuando implementemos autenticación.

    created_at: datetime
    # Fecha y hora exacta del movimiento — generada automáticamente por Supabase.
    # Fundamental para el historial y auditoría del stock.

    class Config:
        from_attributes = True
        # Permite que Pydantic convierta directamente los datos que devuelve
        # Supabase (diccionarios) al formato de este schema.