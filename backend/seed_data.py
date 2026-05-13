"""
seed_data.py — Carga datos de prueba en Supabase
Bulonera Miguel — Sistema de Gestión
Ejecutar desde la carpeta backend con el venv activado:
  python seed_data.py
"""

import sys
import os

# Agregamos el path para importar la config del proyecto
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import supabase

# ─── DATOS DE PRUEBA ──────────────────────────────────────────────────────────

CATEGORIAS = [
    { "nombre": "Bulones",        "descripcion": "Bulones hexagonales, allen y especiales" },
    { "nombre": "Tuercas",        "descripcion": "Tuercas hexagonales, autoblocantes y mariposa" },
    { "nombre": "Arandelas",      "descripcion": "Arandelas planas, de presión y dentadas" },
    { "nombre": "Tornillos",      "descripcion": "Tornillos autorroscantes, madera y máquina" },
    { "nombre": "Pernos",         "descripcion": "Pernos de anclaje y pernos U" },
]

PRODUCTOS = [
    # Bulones
    { "codigo": "BUL-M6-25",   "nombre": "Bulón hexagonal M6 x 25mm zinc",       "descripcion": "Bulón hexagonal zincado M6 x 25mm",        "cat": "Bulones",   "precio": 120,  "stock_actual": 500, "stock_minimo": 100 },
    { "codigo": "BUL-M8-40",   "nombre": "Bulón hexagonal M8 x 40mm zinc",       "descripcion": "Bulón hexagonal zincado M8 x 40mm",        "cat": "Bulones",   "precio": 180,  "stock_actual": 8,   "stock_minimo": 50  },
    { "codigo": "BUL-M10-50",  "nombre": "Bulón hexagonal M10 x 50mm zinc",      "descripcion": "Bulón hexagonal con tuerca, zincado",      "cat": "Bulones",   "precio": 850,  "stock_actual": 150, "stock_minimo": 20  },
    { "codigo": "BUL-M12-60",  "nombre": "Bulón hexagonal M12 x 60mm negro",     "descripcion": "Bulón hexagonal negro M12 x 60mm",         "cat": "Bulones",   "precio": 320,  "stock_actual": 12,  "stock_minimo": 40  },
    { "codigo": "BUL-AL-M8",   "nombre": "Bulón allen M8 x 30mm inox",           "descripcion": "Bulón allen cabeza cilíndrica inoxidable", "cat": "Bulones",   "precio": 450,  "stock_actual": 200, "stock_minimo": 50  },
    # Tuercas
    { "codigo": "TUE-M6",      "nombre": "Tuerca hexagonal M6 zinc",             "descripcion": "Tuerca hexagonal zincada M6",              "cat": "Tuercas",   "precio": 45,   "stock_actual": 5,   "stock_minimo": 200 },
    { "codigo": "TUE-M8",      "nombre": "Tuerca hexagonal M8 zinc",             "descripcion": "Tuerca hexagonal zincada M8",              "cat": "Tuercas",   "precio": 65,   "stock_actual": 800, "stock_minimo": 200 },
    { "codigo": "TUE-M10",     "nombre": "Tuerca hexagonal M10 zinc",            "descripcion": "Tuerca hexagonal zincada M10",             "cat": "Tuercas",   "precio": 95,   "stock_actual": 18,  "stock_minimo": 150 },
    { "codigo": "TUE-AUTO-M8", "nombre": "Tuerca autoblocante M8 zinc",          "descripcion": "Tuerca autoblocante nylon zincada M8",     "cat": "Tuercas",   "precio": 120,  "stock_actual": 300, "stock_minimo": 100 },
    { "codigo": "TUE-MARI-M6", "nombre": "Tuerca mariposa M6 zinc",              "descripcion": "Tuerca mariposa zincada M6",               "cat": "Tuercas",   "precio": 85,   "stock_actual": 7,   "stock_minimo": 80  },
    # Arandelas
    { "codigo": "ARA-PLAN-M8", "nombre": "Arandela plana M8 zinc",               "descripcion": "Arandela plana zincada M8",                "cat": "Arandelas", "precio": 25,   "stock_actual": 1200,"stock_minimo": 300 },
    { "codigo": "ARA-PRES-M8", "nombre": "Arandela de presión M8 zinc",          "descripcion": "Arandela presión zincada M8",              "cat": "Arandelas", "precio": 30,   "stock_actual": 22,  "stock_minimo": 300 },
    { "codigo": "ARA-PLAN-M10","nombre": "Arandela plana M10 zinc",              "descripcion": "Arandela plana zincada M10",               "cat": "Arandelas", "precio": 35,   "stock_actual": 900, "stock_minimo": 200 },
    # Tornillos
    { "codigo": "TOR-AUTO-35", "nombre": "Tornillo autorroscante 4.2 x 35mm",    "descripcion": "Tornillo autorroscante punta aguja",       "cat": "Tornillos", "precio": 15,   "stock_actual": 3,   "stock_minimo": 500 },
    { "codigo": "TOR-MAD-50",  "nombre": "Tornillo para madera 4 x 50mm",        "descripcion": "Tornillo para madera cabeza plana",        "cat": "Tornillos", "precio": 20,   "stock_actual": 2000,"stock_minimo": 400 },
    { "codigo": "TOR-MAQ-M6",  "nombre": "Tornillo máquina M6 x 20mm zinc",      "descripcion": "Tornillo máquina cabeza hexagonal zinc",   "cat": "Tornillos", "precio": 55,   "stock_actual": 400, "stock_minimo": 100 },
    # Pernos
    { "codigo": "PER-ANC-M10", "nombre": "Perno de anclaje M10 x 100mm",         "descripcion": "Perno de anclaje expansivo M10",           "cat": "Pernos",    "precio": 580,  "stock_actual": 45,  "stock_minimo": 30  },
    { "codigo": "PER-U-M8",    "nombre": "Perno U M8 x 60mm zinc",               "descripcion": "Perno en U zincado M8 x 60mm",             "cat": "Pernos",    "precio": 420,  "stock_actual": 9,   "stock_minimo": 25  },
    { "codigo": "PER-ANC-M12", "nombre": "Perno de anclaje M12 x 120mm",         "descripcion": "Perno de anclaje expansivo M12",           "cat": "Pernos",    "precio": 850,  "stock_actual": 60,  "stock_minimo": 20  },
    { "codigo": "PER-ESP-M16", "nombre": "Perno especial M16 x 200mm inox",      "descripcion": "Perno especial inoxidable M16",            "cat": "Pernos",    "precio": 2200, "stock_actual": 3,   "stock_minimo": 10  },
]

# Movimientos: (codigo_producto, tipo, cantidad, motivo)
MOVIMIENTOS = [
    # Bulones — alta rotación
    ("BUL-M6-25",   "salida",  200, "Venta cliente ferretería Norte"),
    ("BUL-M6-25",   "salida",  150, "Venta cliente construcción"),
    ("BUL-M6-25",   "entrada", 300, "Compra proveedor Aceros del Sur"),
    ("BUL-M6-25",   "salida",  80,  "Venta mostrador"),
    ("BUL-M8-40",   "salida",  60,  "Venta cliente constructora"),
    ("BUL-M8-40",   "salida",  40,  "Venta mostrador"),
    ("BUL-M10-50",  "salida",  30,  "Venta cliente metalúrgica"),
    ("BUL-M10-50",  "entrada", 100, "Compra proveedor"),
    ("BUL-M10-50",  "salida",  20,  "Venta mostrador"),
    ("BUL-M12-60",  "salida",  25,  "Venta cliente industria"),
    ("BUL-M12-60",  "salida",  15,  "Venta mostrador"),
    ("BUL-AL-M8",   "salida",  50,  "Venta cliente carpintería metálica"),
    ("BUL-AL-M8",   "entrada", 100, "Compra proveedor"),
    ("BUL-AL-M8",   "salida",  30,  "Venta mostrador"),
    # Tuercas — alta rotación
    ("TUE-M6",      "salida",  500, "Venta cliente ferretería"),
    ("TUE-M6",      "salida",  300, "Venta mayorista"),
    ("TUE-M8",      "salida",  400, "Venta cliente construcción"),
    ("TUE-M8",      "salida",  200, "Venta mostrador"),
    ("TUE-M8",      "entrada", 500, "Compra proveedor"),
    ("TUE-M10",     "salida",  180, "Venta cliente metalúrgica"),
    ("TUE-M10",     "salida",  120, "Venta mayorista"),
    ("TUE-AUTO-M8", "salida",  100, "Venta cliente automotriz"),
    ("TUE-AUTO-M8", "salida",  80,  "Venta mostrador"),
    ("TUE-MARI-M6", "salida",  40,  "Venta mostrador"),
    # Arandelas
    ("ARA-PLAN-M8", "salida",  600, "Venta cliente ferretería"),
    ("ARA-PLAN-M8", "salida",  400, "Venta mayorista"),
    ("ARA-PLAN-M8", "entrada", 800, "Compra proveedor"),
    ("ARA-PRES-M8", "salida",  200, "Venta cliente construcción"),
    ("ARA-PLAN-M10","salida",  350, "Venta cliente metalúrgica"),
    ("ARA-PLAN-M10","salida",  200, "Venta mostrador"),
    # Tornillos
    ("TOR-AUTO-35", "salida",  800, "Venta cliente construcción seco"),
    ("TOR-AUTO-35", "salida",  600, "Venta mayorista"),
    ("TOR-AUTO-35", "entrada", 1000,"Compra proveedor"),
    ("TOR-MAD-50",  "salida",  500, "Venta cliente carpintería"),
    ("TOR-MAD-50",  "salida",  300, "Venta mostrador"),
    ("TOR-MAQ-M6",  "salida",  150, "Venta cliente metalúrgica"),
    ("TOR-MAQ-M6",  "salida",  80,  "Venta mostrador"),
    # Pernos — baja rotación
    ("PER-ANC-M10", "salida",  10,  "Venta cliente construcción"),
    ("PER-ANC-M10", "salida",  8,   "Venta mostrador"),
    ("PER-U-M8",    "salida",  5,   "Venta mostrador"),
    ("PER-ANC-M12", "salida",  12,  "Venta cliente industria"),
    ("PER-ESP-M16", "salida",  2,   "Venta cliente especial"),
]


# ─── FUNCIONES ────────────────────────────────────────────────────────────────

def limpiar_productos_prueba():
    """Elimina solo los productos de prueba (no el BUL-M10-50 original si existe)"""
    codigos_prueba = [p["codigo"] for p in PRODUCTOS if p["codigo"] != "BUL-M10-50"]
    print(f"🧹 Limpiando {len(codigos_prueba)} productos de prueba anteriores...")
    for codigo in codigos_prueba:
        supabase.table("productos").delete().eq("codigo", codigo).execute()

def insertar_categorias():
    print("\n📂 Insertando categorías...")
    ids = {}
    for cat in CATEGORIAS:
        # Verificamos si ya existe
        existing = supabase.table("categorias").select("id, nombre").eq("nombre", cat["nombre"]).execute()
        if existing.data:
            ids[cat["nombre"]] = existing.data[0]["id"]
            print(f"   ✓ Ya existe: {cat['nombre']}")
        else:
            res = supabase.table("categorias").insert(cat).execute()
            ids[cat["nombre"]] = res.data[0]["id"]
            print(f"   + Creada: {cat['nombre']}")
    return ids

def insertar_productos(cat_ids):
    print("\n📦 Insertando productos...")
    prod_ids = {}

    for p in PRODUCTOS:
        # Verificamos si ya existe
        existing = supabase.table("productos").select("id, codigo, stock_actual").eq("codigo", p["codigo"]).execute()
        if existing.data:
            prod_ids[p["codigo"]] = existing.data[0]["id"]
            print(f"   ✓ Ya existe: {p['codigo']} — {p['nombre']}")
            continue

        datos = {
            "codigo":       p["codigo"],
            "nombre":       p["nombre"],
            "descripcion":  p["descripcion"],
            "precio":       p["precio"],
            "stock_actual": p["stock_actual"],
            "stock_minimo": p["stock_minimo"],
            "activo":       True,
            "categoria_id": cat_ids.get(p["cat"]),
        }
        res = supabase.table("productos").insert(datos).execute()
        prod_ids[p["codigo"]] = res.data[0]["id"]
        print(f"   + Insertado: {p['codigo']} — {p['nombre']} (stock: {p['stock_actual']})")

    return prod_ids

def insertar_movimientos(prod_ids):
    print("\n📊 Insertando movimientos de stock...")
    ok = 0
    errores = 0

    for codigo, tipo, cantidad, motivo in MOVIMIENTOS:
        if codigo not in prod_ids:
            print(f"   ⚠ Producto no encontrado: {codigo}")
            errores += 1
            continue
        try:
            supabase.table("movimientos_stock").insert({
                "producto_id": prod_ids[codigo],
                "tipo":        tipo,
                "cantidad":    cantidad,
                "motivo":      motivo,
            }).execute()
            ok += 1
        except Exception as e:
            print(f"   ✗ Error en movimiento {codigo}: {e}")
            errores += 1

    print(f"   ✓ {ok} movimientos insertados, {errores} errores")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  BULONERA MIGUEL — Carga de datos de prueba")
    print("=" * 55)

    try:
        limpiar_productos_prueba()
        cat_ids  = insertar_categorias()
        prod_ids = insertar_productos(cat_ids)
        insertar_movimientos(prod_ids)

        print("\n" + "=" * 55)
        print("  ✅ Datos de prueba cargados correctamente")
        print(f"  • {len(CATEGORIAS)} categorías")
        print(f"  • {len(PRODUCTOS)} productos")
        print(f"  • {len(MOVIMIENTOS)} movimientos de stock")
        print("=" * 55)

    except Exception as e:
        print(f"\n❌ Error general: {e}")
        raise
