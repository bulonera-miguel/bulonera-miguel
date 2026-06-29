# ============================================================
# routers/flujo_caja.py — Reporte Flujo de Caja
# Bulonera Miguel
#
# Ingresos reales =
#   ventas al contado (clientes SIN cuenta corriente)
#   + pagos recibidos en cuenta corriente (pagos_cuenta_corriente)
#
# Egresos reales =
#   compras al contado (proveedores SIN cuenta corriente)
#   + pagos realizados en cuenta corriente (pagos_proveedores)
# ============================================================

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import date
import io
from app.database import supabase
from app.pdf_reportes import generar_pdf_reporte

router = APIRouter(
    prefix="/api/flujo-caja",
    tags=["Flujo de Caja"],
)

NOMBRES_MES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]


async def _calcular_flujo(desde_query: date, hasta_query: date) -> list:
    meses = {}

    def agregar(mes_key, campo, monto):
        if mes_key not in meses:
            meses[mes_key] = {
                "mes": mes_key,
                "ingresos_contado": 0.0,
                "ingresos_cc":      0.0,
                "egresos_contado":  0.0,
                "egresos_cc":       0.0,
            }
        meses[mes_key][campo] += monto

    # Clientes con CC
    clientes_cc_res = (
        supabase.table("clientes")
        .select("id")
        .eq("tiene_cuenta_corriente", True)
        .execute()
    )
    ids_clientes_cc = {c["id"] for c in (clientes_cc_res.data or [])}

    # Ventas al contado
    ventas_res = (
    supabase.table("ventas")
    .select("cliente_id, total, fecha, paga_contado")
    .gte("fecha", desde_query.isoformat())
    .lte("fecha", hasta_query.isoformat())
    .execute()
    )
    for v in (ventas_res.data or []):
        mes_key    = v["fecha"][:7]
        cliente_id = v.get("cliente_id")
        monto      = float(v["total"])
        paga_contado = v.get("paga_contado", False)

        # Entra como ingreso si:
        # - no tiene cliente, o
        # - el cliente no es CC, o
        # - el cliente es CC pero marcó "paga al contado"
        if not cliente_id or cliente_id not in ids_clientes_cc or paga_contado:
            agregar(mes_key, "ingresos_contado", monto)

    # Pagos CC clientes
    pagos_cc_res = (
        supabase.table("pagos_cuenta_corriente")
        .select("monto, fecha")
        .gte("fecha", desde_query.isoformat())
        .lte("fecha", hasta_query.isoformat())
        .execute()
    )
    for p in (pagos_cc_res.data or []):
        agregar(p["fecha"][:7], "ingresos_cc", float(p["monto"]))

    # Proveedores con CC
    proveedores_cc_res = (
        supabase.table("proveedores")
        .select("id")
        .eq("tiene_cuenta_corriente", True)
        .execute()
    )
    ids_proveedores_cc = {p["id"] for p in (proveedores_cc_res.data or [])}

    # Compras al contado
    compras_res = (
        supabase.table("compras_proveedores")
        .select("proveedor_id, total, fecha")
        .gte("fecha", desde_query.isoformat())
        .lte("fecha", hasta_query.isoformat())
        .execute()
    )
    for c in (compras_res.data or []):
        mes_key = c["fecha"][:7]
        proveedor_id = c.get("proveedor_id")
        monto = float(c["total"])
        if not proveedor_id or proveedor_id not in ids_proveedores_cc:
            agregar(mes_key, "egresos_contado", monto)

    # Pagos CC proveedores
    pagos_prov_res = (
        supabase.table("pagos_proveedores")
        .select("monto, fecha")
        .gte("fecha", desde_query.isoformat())
        .lte("fecha", hasta_query.isoformat())
        .execute()
    )
    for p in (pagos_prov_res.data or []):
        agregar(p["fecha"][:7], "egresos_cc", float(p["monto"]))

    # Construir resultado
    resultado = []
    for mes_key, d in sorted(meses.items()):
        anio, nm = mes_key.split("-")
        ingresos = round(d["ingresos_contado"] + d["ingresos_cc"], 2)
        egresos  = round(d["egresos_contado"]  + d["egresos_cc"],  2)
        neto     = round(ingresos - egresos, 2)
        resultado.append({
            "mes":              mes_key,
            "mes_nombre":       f"{NOMBRES_MES[int(nm)]} {anio}",
            "ingresos":         ingresos,
            "ingresos_contado": round(d["ingresos_contado"], 2),
            "ingresos_cc":      round(d["ingresos_cc"], 2),
            "egresos":          egresos,
            "egresos_contado":  round(d["egresos_contado"], 2),
            "egresos_cc":       round(d["egresos_cc"], 2),
            "neto":             neto,
            "estado":           "positivo" if neto >= 0 else "negativo",
        })
    return resultado


@router.get("/", response_model=list[dict])
async def reporte_flujo_caja(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    try:
        hoy = date.today()
        desde_query = desde or date(hoy.year, 1, 1)
        hasta_query = hasta or date(hoy.year, 12, 31)
        return await _calcular_flujo(desde_query, hasta_query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en flujo de caja: {str(e)}")


@router.get("/pdf")
async def reporte_flujo_caja_pdf(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
):
    try:
        hoy = date.today()
        desde_query = desde or date(hoy.year, 1, 1)
        hasta_query = hasta or date(hoy.year, 12, 31)
        datos = await _calcular_flujo(desde_query, hasta_query)
        filtros = {"desde": str(desde_query), "hasta": str(hasta_query)}
        pdf_bytes = generar_pdf_reporte("flujo-caja", datos, filtros)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Reporte_Flujo_Caja.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
