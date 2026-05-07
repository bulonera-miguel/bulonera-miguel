from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase
from app.routers import productos  # ← AGREGAR
from app.routers import categorias  # ← agregar con los otros imports
from app.routers import stock    # ← agregar con los otros imports
from app.routers import portada    # ← agregar

app = FastAPI(title="Bulonera Miguel API", version="1.0.0")

# Permitir requests desde el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(productos.router)  # ← AGREGAR
app.include_router(categorias.router)  # ← agregar después de productos
app.include_router(stock.router) # ← agregar después de categorias
app.include_router(portada.router) # ← agregar

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