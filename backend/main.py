from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase

app = FastAPI(title="Bulonera Miguel API", version="1.0.0")

# Permitir requests desde el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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