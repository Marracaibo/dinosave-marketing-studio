from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from pathlib import Path
import shutil
import os
from PIL import Image
from io import BytesIO
import asyncio
import httpx

# Rimozione sfondo: remove.bg API (gratuita 50 img/mese) o rembg locale
REMOVEBG_API_KEY = os.environ.get("REMOVEBG_API_KEY", "")

# rembg locale (opzionale, richiede molta RAM)
REMBG_AVAILABLE = False
try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    pass

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


@router.post("/overlays/{overlay_id:path}/remove-background")
async def remove_overlay_background(overlay_id: str):
    """Rimuove lo sfondo da un overlay usando remove.bg API o rembg locale."""
    
    # Verifica disponibilità metodi
    if not REMOVEBG_API_KEY and not REMBG_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="Configura REMOVEBG_API_KEY su Render (gratuita: https://www.remove.bg/api)"
        )
    
    # Decodifica l'ID
    from urllib.parse import unquote
    overlay_id = unquote(overlay_id)
    
    # Trova l'overlay
    overlay_path = None
    is_video = False
    
    for ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
        test_path = OVERLAYS_DIR / f"{overlay_id}{ext}"
        if test_path.exists():
            overlay_path = test_path
            break
    
    if not overlay_path:
        for ext in ['.mp4', '.mov', '.webm']:
            test_path = OVERLAYS_DIR / f"{overlay_id}{ext}"
            if test_path.exists():
                overlay_path = test_path
                is_video = True
                break
    
    if not overlay_path:
        for file in OVERLAYS_DIR.iterdir():
            if file.stem.lower() == overlay_id.lower() or file.stem == overlay_id:
                overlay_path = file
                is_video = file.suffix.lower() in ['.mp4', '.mov', '.webm']
                break
    
    if not overlay_path:
        raise HTTPException(status_code=404, detail=f"Overlay '{overlay_id}' non trovato")
    
    try:
        # Se video, estrai primo frame
        if is_video:
            from moviepy.editor import VideoFileClip
            clip = VideoFileClip(str(overlay_path))
            frame = clip.get_frame(0)
            clip.close()
            img = Image.fromarray(frame)
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            input_data = buffer.getvalue()
        else:
            with open(overlay_path, "rb") as f:
                input_data = f.read()
        
        output_data = None
        method_used = ""
        
        # Metodo 1: remove.bg API (leggera, gratuita 50 img/mese)
        if REMOVEBG_API_KEY:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.remove.bg/v1.0/removebg",
                    headers={"X-Api-Key": REMOVEBG_API_KEY},
                    files={"image_file": ("image.png", input_data, "image/png")},
                    data={"size": "auto"},
                    timeout=60.0
                )
                if response.status_code == 200:
                    output_data = response.content
                    method_used = "remove.bg"
                else:
                    error = response.json().get("errors", [{}])[0].get("title", "Errore")
                    raise HTTPException(status_code=500, detail=f"remove.bg: {error}")
        
        # Metodo 2: rembg locale (fallback)
        elif REMBG_AVAILABLE:
            loop = asyncio.get_event_loop()
            output_data = await loop.run_in_executor(None, remove, input_data)
            method_used = "rembg"
        
        # Salva PNG
        output_filename = f"{overlay_id}_nobg.png"
        output_path = OVERLAYS_DIR / output_filename
        
        with open(output_path, "wb") as f:
            f.write(output_data)
        
        return {
            "success": True,
            "id": f"{overlay_id}_nobg",
            "filename": output_filename,
            "url": f"/assets/overlays/{output_filename}",
            "message": f"Sfondo rimosso con {method_used}!" + (" (da video)" if is_video else "")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")
