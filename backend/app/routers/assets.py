from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from pathlib import Path
import shutil
import os
from PIL import Image
from io import BytesIO
import asyncio

# Import rembg per rimozione sfondo AI
try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

router = APIRouter()

ASSETS_DIR = Path("assets")
OVERLAYS_DIR = ASSETS_DIR / "overlays"
AUDIO_DIR = ASSETS_DIR / "audio"

class AssetInfo:
    def __init__(self, name: str, path: str, size: int, asset_type: str):
        self.name = name
        self.path = path
        self.size = size
        self.asset_type = asset_type

@router.get("/overlays")
async def list_overlays():
    """Lista tutti gli overlay disponibili (dino, etc.)"""
    overlays = []
    if OVERLAYS_DIR.exists():
        for file_path in OVERLAYS_DIR.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in ['.mov', '.mp4', '.webm', '.gif', '.png']:
                overlays.append({
                    "id": file_path.stem,
                    "filename": file_path.name,
                    "url": f"/assets/overlays/{file_path.name}",
                    "size": file_path.stat().st_size,
                    "type": "video" if file_path.suffix.lower() in ['.mov', '.mp4', '.webm', '.gif'] else "image"
                })
    return {"overlays": overlays}

@router.get("/audio")
async def list_audio():
    """Lista tutte le tracce audio disponibili"""
    audio_files = []
    if AUDIO_DIR.exists():
        for file_path in AUDIO_DIR.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in ['.mp3', '.wav', '.m4a', '.aac']:
                audio_files.append({
                    "id": file_path.name,
                    "filename": file_path.name,
                    "url": f"/assets/audio/{file_path.name}",
                    "size": file_path.stat().st_size,
                })
    return {"audio": audio_files}

@router.post("/overlays/upload")
async def upload_overlay(file: UploadFile = File(...)):
    """Carica un nuovo overlay (es. dino danzante)"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome file mancante")
    
    allowed_extensions = ['.mov', '.mp4', '.webm', '.gif', '.png']
    ext = Path(file.filename).suffix.lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato non supportato. Usa: {', '.join(allowed_extensions)}"
        )
    
    file_path = OVERLAYS_DIR / file.filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "success": True,
            "id": file_path.stem,
            "filename": file.filename,
            "url": f"/assets/overlays/{file.filename}",
            "message": "Overlay caricato con successo!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    """Carica una nuova traccia audio"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome file mancante")
    
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.aac']
    ext = Path(file.filename).suffix.lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato non supportato. Usa: {', '.join(allowed_extensions)}"
        )
    
    file_path = AUDIO_DIR / file.filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "success": True,
            "id": file.filename,
            "filename": file.filename,
            "url": f"/assets/audio/{file.filename}",
            "message": "Audio caricato con successo!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/overlays/{overlay_id}")
async def delete_overlay(overlay_id: str):
    """Elimina un overlay"""
    for ext in ['.mov', '.mp4', '.webm', '.gif', '.png', '']:
        file_path = OVERLAYS_DIR / f"{overlay_id}{ext}"
        if file_path.exists():
            file_path.unlink()
            return {"success": True, "message": "Overlay eliminato"}
    
    raise HTTPException(status_code=404, detail="Overlay non trovato")

@router.delete("/audio/{audio_id}")
async def delete_audio(audio_id: str):
    """Elimina una traccia audio"""
    file_path = AUDIO_DIR / audio_id
    if file_path.exists():
        file_path.unlink()
        return {"success": True, "message": "Audio eliminato"}
    
    raise HTTPException(status_code=404, detail="Audio non trovato")


@router.post("/overlays/{overlay_id}/remove-background")
async def remove_overlay_background(overlay_id: str):
    """Rimuove lo sfondo da un overlay usando AI (rembg)"""
    if not REMBG_AVAILABLE:
        raise HTTPException(status_code=500, detail="rembg non disponibile sul server")
    
    # Trova l'overlay
    overlay_path = None
    for ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
        test_path = OVERLAYS_DIR / f"{overlay_id}{ext}"
        if test_path.exists():
            overlay_path = test_path
            break
    
    # Se non trovato con estensione, cerca il file esatto
    if not overlay_path:
        for file in OVERLAYS_DIR.iterdir():
            if file.stem == overlay_id and file.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
                overlay_path = file
                break
    
    if not overlay_path:
        raise HTTPException(status_code=404, detail="Overlay non trovato o formato non supportato (solo immagini)")
    
    try:
        # Leggi l'immagine
        with open(overlay_path, "rb") as f:
            input_data = f.read()
        
        # Rimuovi lo sfondo usando rembg (esegui in thread per non bloccare)
        loop = asyncio.get_event_loop()
        output_data = await loop.run_in_executor(None, remove, input_data)
        
        # Salva come PNG con trasparenza
        output_filename = f"{overlay_id}_nobg.png"
        output_path = OVERLAYS_DIR / output_filename
        
        with open(output_path, "wb") as f:
            f.write(output_data)
        
        return {
            "success": True,
            "id": f"{overlay_id}_nobg",
            "filename": output_filename,
            "url": f"/assets/overlays/{output_filename}",
            "message": "Sfondo rimosso con successo!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante la rimozione sfondo: {str(e)}")
