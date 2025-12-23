from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.routers import download, process, assets

app = FastAPI(
    title="DinoSave Marketing Studio API",
    description="API per scaricare, editare e remixare video da TikTok/Instagram",
    version="1.0.0"
)

# CORS per il frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permetti tutte le origini in produzione
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crea cartelle necessarie
UPLOAD_DIR = Path("uploads")
TEMP_DIR = Path("temp")
OUTPUT_DIR = Path("output")
ASSETS_DIR = Path("assets")

for dir_path in [UPLOAD_DIR, TEMP_DIR, OUTPUT_DIR, ASSETS_DIR / "overlays", ASSETS_DIR / "audio"]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Serve file statici
app.mount("/output", StaticFiles(directory="output"), name="output")
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# Routers
app.include_router(download.router, prefix="/api/download", tags=["Download"])
app.include_router(process.router, prefix="/api/process", tags=["Process"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])

@app.get("/")
async def root():
    return {"message": "Video Remix Studio API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
