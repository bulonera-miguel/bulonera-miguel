# ============================================================
# routers/cuenta_corriente.py — Cuenta corriente de clientes
# Bulonera Miguel
# ============================================================

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.database import supabase

router = APIRouter(
    prefix="/api/cuenta-corriente",
    tags=["Cuenta Corriente"],
)

# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class PagoCreate(BaseModel):
    monto:         float
    fecha:         Optional[str] = None
    medio_pago:    Optional[str] = "efectivo"
    observaciones: Optional[str] = None


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def calcular_saldo(cliente_id: str, ventas: list, pagos: list) -> float:
    """
    saldo > 0 → cliente debe plata
    saldo < 0 → cliente tiene saldo a favor
    """
    # Excluir ventas que ya pagaron al contado
    total_ventas = sum(float(v["total"]) for v in ventas if not v.get("paga_contado", False))
    total_pagos  = sum(float(p["monto"]) for p in pagos)
    return round(total_ventas - total_pagos, 2)


def estado_deuda(saldo: float) -> str:
    if saldo <= 0:
        return "a_favor"
    elif saldo < 20000:
        return "normal"
    elif saldo < 50000:
        return "atencion"
    else:
        return "critico"


# ─── LISTAR CLIENTES CON CUENTA CORRIENTE ────────────────────────────────────

@router.get("/", response_model=list[dict])
async def listar_cuenta_corriente():
    """
    Devuelve todos los clientes con cuenta corriente habilitada,
    con su saldo actual y estado de deuda.
    """
    try:
        # Traer clientes con cuenta corriente
        clientes_res = (
            supabase.table("clientes")
            .select("id, nombre, cuit, telefono, email")
            .eq("tiene_cuenta_corriente", True)
            .order("nombre")
            .execute()
        )
        clientes = clientes_res.data or []

        resultado = []
        for cliente in clientes:
            cid = cliente["id"]

            # Ventas del cliente (todas, no pagadas aún consideramos el total)
            ventas_res = (
                supabase.table("ventas")
                .select("id, total, fecha, paga_contado")
                .eq("cliente_id", cid)
                .execute()
            )
            ventas = ventas_res.data or []

            # Pagos del cliente
            pagos_res = (
                supabase.table("pagos_cuenta_corriente")
                .select("id, monto, fecha")
                .eq("cliente_id", cid)
                .execute()
            )
            pagos = pagos_res.data or []

            saldo = calcular_saldo(cid, ventas, pagos)

            resultado.append({
                **cliente,
                "total_ventas":  round(sum(float(v["total"]) for v in ventas), 2),
                "total_pagos":   round(sum(float(p["monto"]) for p in pagos), 2),
                "saldo":         saldo,
                "estado":        estado_deuda(saldo),
                "cant_ventas":   len(ventas),
                "cant_pagos":    len(pagos),
            })

        # Ordenar por saldo descendente (mayor deuda primero)
        resultado.sort(key=lambda x: x["saldo"], reverse=True)
        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar cuenta corriente: {str(e)}")


# ─── DETALLE DE UN CLIENTE ────────────────────────────────────────────────────

@router.get("/{cliente_id}", response_model=dict)
async def detalle_cuenta_corriente(
    cliente_id: str,
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    """
    Devuelve el detalle completo de la cuenta corriente de un cliente:
    historial de ventas, historial de pagos y saldo actual.
    """
    try:
        # Datos del cliente
        cliente_res = (
            supabase.table("clientes")
            .select("id, nombre, cuit, telefono, email, tiene_cuenta_corriente")
            .eq("id", cliente_id)
            .single()
            .execute()
        )
        if not cliente_res.data:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        cliente = cliente_res.data

        # Ventas — con filtro de fecha opcional
        q_ventas = (
            supabase.table("ventas")
            .select("id, total, fecha, paga_contado")
            .eq("cliente_id", cliente_id)
            .order("fecha", desc=True)
        )
        if desde:
            q_ventas = q_ventas.gte("fecha", desde.isoformat())
        if hasta:
            q_ventas = q_ventas.lte("fecha", hasta.isoformat())
        ventas = q_ventas.execute().data or []

        # Pagos — con filtro de fecha opcional
        q_pagos = (
            supabase.table("pagos_cuenta_corriente")
            .select("id, monto, fecha, medio_pago, observaciones")
            .eq("cliente_id", cliente_id)
            .order("fecha", desc=True)
        )
        if desde:
            q_pagos = q_pagos.gte("fecha", desde.isoformat())
        if hasta:
            q_pagos = q_pagos.lte("fecha", hasta.isoformat())
        pagos = q_pagos.execute().data or []

        # Saldo siempre sobre el total histórico (sin filtro de fecha)
        todas_ventas = (
            supabase.table("ventas")
            .select("total, paga_contado")
            .eq("cliente_id", cliente_id)
            .execute()
        ).data or []
        todos_pagos = (
            supabase.table("pagos_cuenta_corriente")
            .select("monto")
            .eq("cliente_id", cliente_id)
            .execute()
        ).data or []

        saldo = calcular_saldo(cliente_id, todas_ventas, todos_pagos)

        return {
            **cliente,
            "saldo":   saldo,
            "estado":  estado_deuda(saldo),
            "ventas":  ventas,
            "pagos":   pagos,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener detalle: {str(e)}")


# ─── REGISTRAR PAGO ───────────────────────────────────────────────────────────

@router.post("/{cliente_id}/pagos", status_code=201)
async def registrar_pago(cliente_id: str, datos: PagoCreate):
    """Registra un pago del cliente contra su cuenta corriente."""
    try:
        # Verificar que el cliente existe y tiene cuenta corriente
        cliente_res = (
            supabase.table("clientes")
            .select("id, nombre, tiene_cuenta_corriente")
            .eq("id", cliente_id)
            .single()
            .execute()
        )
        if not cliente_res.data:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        if not cliente_res.data["tiene_cuenta_corriente"]:
            raise HTTPException(status_code=400, detail="El cliente no tiene cuenta corriente habilitada")

        fecha_pago = datos.fecha or date.today().isoformat()

        pago_res = (
            supabase.table("pagos_cuenta_corriente")
            .insert({
                "cliente_id":    cliente_id,
                "fecha":         fecha_pago,
                "monto":         round(datos.monto, 2),
                "medio_pago":    datos.medio_pago or "efectivo",
                "observaciones": datos.observaciones,
            })
            .execute()
        )

        return {
            "ok":       True,
            "pago_id":  pago_res.data[0]["id"],
            "cliente":  cliente_res.data["nombre"],
            "monto":    round(datos.monto, 2),
            "fecha":    fecha_pago,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar pago: {str(e)}")


# ─── HABILITAR / DESHABILITAR CUENTA CORRIENTE ───────────────────────────────

@router.patch("/{cliente_id}/habilitar", status_code=200)
async def habilitar_cuenta_corriente(cliente_id: str, habilitar: bool = Query(True)):
    try:
        # Si se intenta DESACTIVAR, verificar que no tenga saldo pendiente
        if not habilitar:
            todas_ventas = supabase.table("ventas").select("total").eq("cliente_id", cliente_id).execute().data or []
            todos_pagos  = supabase.table("pagos_cuenta_corriente").select("monto").eq("cliente_id", cliente_id).execute().data or []
            total_ventas = sum(float(v["total"]) for v in todas_ventas)
            total_pagos  = sum(float(p["monto"]) for p in todos_pagos)
            saldo = round(total_ventas - total_pagos, 2)
            if saldo > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"No se puede desactivar la cuenta corriente. El cliente tiene un saldo pendiente de ${saldo:,.2f}. Registrá el pago completo antes de desactivarla."
                )
        res = supabase.table("clientes").update({"tiene_cuenta_corriente": habilitar}).eq("id", cliente_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return {"ok": True, "cliente_id": cliente_id, "tiene_cuenta_corriente": habilitar}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar: {str(e)}")