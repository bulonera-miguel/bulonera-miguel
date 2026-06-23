# ============================================================
# routers/cuenta_corriente_proveedores.py
# Cuenta corriente de proveedores — Bulonera Miguel
#
# Lógica:
#   saldo > 0 → la bulonera le debe al proveedor
#   saldo < 0 → la bulonera pagó de más (saldo a favor)
# ============================================================

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.database import supabase

router = APIRouter(
    prefix="/api/cuenta-corriente-proveedores",
    tags=["Cuenta Corriente Proveedores"],
)

# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class PagoProvCreate(BaseModel):
    monto:         float
    fecha:         Optional[str] = None
    medio_pago:    Optional[str] = "efectivo"
    observaciones: Optional[str] = None


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def calcular_saldo(compras: list, pagos: list) -> float:
    """
    saldo > 0 → la bulonera debe al proveedor
    saldo < 0 → saldo a favor de la bulonera
    """
    total_compras = sum(float(c["total"]) for c in compras)
    total_pagos   = sum(float(p["monto"]) for p in pagos)
    return round(total_compras - total_pagos, 2)


def estado_deuda(saldo: float) -> str:
    if saldo <= 0:
        return "a_favor"
    elif saldo < 20000:
        return "normal"
    elif saldo < 50000:
        return "atencion"
    else:
        return "critico"


# ─── LISTAR PROVEEDORES CON SALDO ─────────────────────────────────────────────

@router.get("/", response_model=list[dict])
async def listar_cuenta_corriente_proveedores():
    """
    Devuelve todos los proveedores con su saldo actual.
    Solo muestra proveedores que tienen al menos una compra registrada.
    """
    try:
        # Traer todos los proveedores
        proveedores_res = (
            supabase.table("proveedores")
            .select("id, nombre, cuit, telefono, email")
            .eq("tiene_cuenta_corriente", True)
            .order("nombre")
            .execute()
        )
        proveedores = proveedores_res.data or []

        resultado = []
        for prov in proveedores:
            pid = prov["id"]

            # Compras a este proveedor
            compras_res = (
                supabase.table("compras_proveedores")
                .select("id, total, fecha")
                .eq("proveedor_id", pid)
                .execute()
            )
            compras = compras_res.data or []

            #realizados a este proveedor
            pagos_res = (
                supabase.table("pagos_proveedores")
                .select("id, monto, fecha")
                .eq("proveedor_id", pid)
                .execute()
            )
            pagos = pagos_res.data or []

            saldo = calcular_saldo(compras, pagos)

            resultado.append({
                **prov,
                "total_compras":  round(sum(float(c["total"]) for c in compras), 2),
                "total_pagos":    round(sum(float(p["monto"]) for p in pagos), 2),
                "saldo":          saldo,
                "estado":         estado_deuda(saldo),
                "cant_compras":   len(compras),
                "cant_pagos":     len(pagos),
            })

        # Ordenar por saldo descendente (mayor deuda primero)
        resultado.sort(key=lambda x: x["saldo"], reverse=True)
        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar cuenta corriente: {str(e)}")


# ─── DETALLE DE UN PROVEEDOR ──────────────────────────────────────────────────

@router.get("/{proveedor_id}", response_model=dict)
async def detalle_cuenta_corriente_proveedor(
    proveedor_id: str,
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    """
    Devuelve el detalle completo de la cuenta corriente de un proveedor:
    historial de compras, historial de pagos y saldo actual.
    """
    try:
        # Datos del proveedor
        prov_res = (
            supabase.table("proveedores")
            .select("id, nombre, cuit, telefono, email")
            .eq("id", proveedor_id)
            .single()
            .execute()
        )
        if not prov_res.data:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        proveedor = prov_res.data

        # Compras — con filtro de fecha opcional
        q_compras = (
            supabase.table("compras_proveedores")
            .select("id, total, fecha, observaciones")
            .eq("proveedor_id", proveedor_id)
            .order("fecha", desc=True)
        )
        if desde:
            q_compras = q_compras.gte("fecha", desde.isoformat())
        if hasta:
            q_compras = q_compras.lte("fecha", hasta.isoformat())
        compras = q_compras.execute().data or []

        # Pagos — con filtro de fecha opcional
        q_pagos = (
            supabase.table("pagos_proveedores")
            .select("id, monto, fecha, medio_pago, observaciones")
            .eq("proveedor_id", proveedor_id)
            .order("fecha", desc=True)
        )
        if desde:
            q_pagos = q_pagos.gte("fecha", desde.isoformat())
        if hasta:
            q_pagos = q_pagos.lte("fecha", hasta.isoformat())
        pagos = q_pagos.execute().data or []

        # Saldo siempre sobre el total histórico (sin filtro de fecha)
        todas_compras = (
            supabase.table("compras_proveedores")
            .select("total")
            .eq("proveedor_id", proveedor_id)
            .execute()
        ).data or []
        todos_pagos = (
            supabase.table("pagos_proveedores")
            .select("monto")
            .eq("proveedor_id", proveedor_id)
            .execute()
        ).data or []

        saldo = calcular_saldo(todas_compras, todos_pagos)

        return {
            **proveedor,
            "saldo":    saldo,
            "estado":   estado_deuda(saldo),
            "compras":  compras,
            "pagos":    pagos,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener detalle: {str(e)}")


# ─── REGISTRAR PAGO A PROVEEDOR ───────────────────────────────────────────────

@router.post("/{proveedor_id}/pagos", status_code=201)
async def registrar_pago_proveedor(proveedor_id: str, datos: PagoProvCreate):
    """Registra un pago de la bulonera hacia el proveedor."""
    try:
        # Verificar que el proveedor existe
        prov_res = (
            supabase.table("proveedores")
            .select("id, nombre")
            .eq("id", proveedor_id)
            .single()
            .execute()
        )
        if not prov_res.data:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")

        fecha_pago = datos.fecha or date.today().isoformat()

        pago_res = (
            supabase.table("pagos_proveedores")
            .insert({
                "proveedor_id":  proveedor_id,
                "fecha":         fecha_pago,
                "monto":         round(datos.monto, 2),
                "medio_pago":    datos.medio_pago or "efectivo",
                "observaciones": datos.observaciones,
            })
            .execute()
        )

        return {
            "ok":          True,
            "pago_id":     pago_res.data[0]["id"],
            "proveedor":   prov_res.data["nombre"],
            "monto":       round(datos.monto, 2),
            "fecha":       fecha_pago,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar pago: {str(e)}")


@router.patch("/{proveedor_id}/habilitar", status_code=200)
async def habilitar_cuenta_corriente_proveedor(proveedor_id: str, habilitar: bool = Query(True)):
    try:
        if not habilitar:
            todas_compras = supabase.table("compras_proveedores").select("total").eq("proveedor_id", proveedor_id).execute().data or []
            todos_pagos   = supabase.table("pagos_proveedores").select("monto").eq("proveedor_id", proveedor_id).execute().data or []
            total_compras = sum(float(c["total"]) for c in todas_compras)
            total_pagos   = sum(float(p["monto"]) for p in todos_pagos)
            saldo = round(total_compras - total_pagos, 2)
            if saldo > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"No se puede desactivar la cuenta corriente. La bulonera tiene un saldo pendiente de ${saldo:,.2f} con este proveedor. Registrá el pago completo antes de desactivarla."
                )
        res = supabase.table("proveedores").update({"tiene_cuenta_corriente": habilitar}).eq("id", proveedor_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        return {"ok": True, "proveedor_id": proveedor_id, "tiene_cuenta_corriente": habilitar}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar: {str(e)}")