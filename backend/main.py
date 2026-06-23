from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase
from app.routers import productos  # ← AGREGAR
from app.routers import categorias  # ← agregar con los otros imports
from app.routers import stock    # ← agregar con los otros imports
from app.routers import portada    # ← agregar
from app.routers import reportes
from app.routers import usuarios
from app.routers import facturacion
from app.routers import proveedores
from app.routers import compras
from app.routers import ventas
from app.routers import cuenta_corriente
from app.routers import cuenta_corriente_proveedores
from app.routers import flujo_caja

app = FastAPI(title="Bulonera Miguel API", version="1.0.0")

# Permitir requests desde el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://bulonera-miguel.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(productos.router)  # ← AGREGAR
app.include_router(categorias.router)  # ← agregar después de productos
app.include_router(stock.router) # ← agregar después de categorias
app.include_router(portada.router) # ← agregar
app.include_router(reportes.router)
app.include_router(usuarios.router)
app.include_router(facturacion.router)
app.include_router(proveedores.router)
app.include_router(compras.router)
app.include_router(ventas.router)
app.include_router(cuenta_corriente.router)
app.include_router(cuenta_corriente_proveedores.router)
app.include_router(flujo_caja.router)

@app.get("/")
def root():
    return {"mensaje": "API Bulonera Miguel funcionando"}

@app.get("/api/health")
def health():
    return {"estado": "activo", "version": "1.0.0"}

@app.get("/api/test-db")
def test_db():
    try:
        result = supabase.table("productos").select("*").limit(1).execute()
        return {"estado": "conectado a Supabase", "data": result.data}
    except Exception as e:
        return {"estado": "error", "detalle": str(e)}