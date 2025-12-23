from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import subprocess
import os
import uuid
import json
from pathlib import Path
import shutil
import asyncio

router = APIRouter()

# FFmpeg path - su Render/Linux usa "ffmpeg", su Windows usa il path assoluto
import platform
if platform.system() == "Windows":
    FFMPEG_PATH = r"C:\Users\39351\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
else:
    FFMPEG_PATH = "ffmpeg"

TEMP_DIR = Path("temp")
OUTPUT_DIR = Path("output")
ASSETS_DIR = Path("assets")

class ProcessRequest(BaseModel):
    video_id: str
    overlay_id: Optional[str] = None
    overlay_position: str = "bottom-right"  # top-left, top-right, bottom-left, bottom-right, center
    overlay_scale: float = 0.25  # 25% della dimensione video
    audio_id: Optional[str] = None
    remove_original_audio: bool = False
    text_overlay: Optional[str] = None
    text_position: str = "top-center"
    text_font_size: int = 48

class ProcessResponse(BaseModel):
    success: bool
    output_filename: str
    output_url: str
    message: str

def get_position_filter(position: str, video_w: str, video_h: str, overlay_w: str, overlay_h: str, margin: int = 20):
    """Calcola la posizione FFmpeg per l'overlay"""
    positions = {
        "top-left": f"{margin}:{margin}",
        "top-right": f"{video_w}-{overlay_w}-{margin}:{margin}",
        "bottom-left": f"{margin}:{video_h}-{overlay_h}-{margin}",
        "bottom-right": f"{video_w}-{overlay_w}-{margin}:{video_h}-{overlay_h}-{margin}",
        "center": f"({video_w}-{overlay_w})/2:({video_h}-{overlay_h})/2",
    }
    return positions.get(position, positions["bottom-right"])

def get_text_position_filter(position: str):
    """Posizione del testo"""
    positions = {
        "top-left": "x=20:y=40",
        "top-center": "x=(w-text_w)/2:y=40",
        "top-right": "x=w-text_w-20:y=40",
        "center": "x=(w-text_w)/2:y=(h-text_h)/2",
        "bottom-center": "x=(w-text_w)/2:y=h-text_h-40",
    }
    return positions.get(position, positions["top-center"])

async def run_ffmpeg(cmd: List[str]):
    """Esegue FFmpeg in modo asincrono"""
    def _run():
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        return result
    
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run)
    
    if result.returncode != 0:
        raise Exception(f"FFmpeg error: {result.stderr}")
    
    return result

@router.post("/remix", response_model=ProcessResponse)
async def process_video(request: ProcessRequest):
    """
    Processa il video con overlay, audio e testo.
    """
    output_id = str(uuid.uuid4())[:8]
    output_filename = f"remix_{output_id}.mp4"
    output_path = OUTPUT_DIR / output_filename
    
    # Trova il video sorgente
    source_files = list(TEMP_DIR.glob(f"{request.video_id}.*"))
    if not source_files:
        raise HTTPException(status_code=404, detail="Video sorgente non trovato")
    
    source_path = source_files[0]
    
    # Costruisci il comando FFmpeg
    cmd = [FFMPEG_PATH, "-y", "-i", str(source_path)]
    
    filter_complex = []
    current_stream = "[0:v]"
    
    # Overlay video (dino)
    if request.overlay_id:
        # L'overlay_id potrebbe essere il filename completo o solo lo stem
        overlay_path = ASSETS_DIR / "overlays" / request.overlay_id
        if not overlay_path.exists():
            # Prova con estensioni comuni
            for ext in ['.mov', '.mp4', '.webm', '.gif', '.png']:
                test_path = ASSETS_DIR / "overlays" / f"{request.overlay_id}{ext}"
                if test_path.exists():
                    overlay_path = test_path
                    break
            # Se ancora non trovato, cerca per stem (nome senza estensione)
            if not overlay_path.exists():
                for file in (ASSETS_DIR / "overlays").iterdir():
                    if file.stem == request.overlay_id:
                        overlay_path = file
                        break
        
        if overlay_path.exists():
            cmd.extend(["-i", str(overlay_path)])
            
            # Scala l'overlay
            scale_filter = f"[1:v]scale=iw*{request.overlay_scale}:ih*{request.overlay_scale}[overlay_scaled]"
            filter_complex.append(scale_filter)
            
            # Posizione overlay
            pos = get_position_filter(
                request.overlay_position, 
                "W", "H", "w", "h"
            )
            overlay_filter = f"{current_stream}[overlay_scaled]overlay={pos}:shortest=1[overlaid]"
            filter_complex.append(overlay_filter)
            current_stream = "[overlaid]"
    
    # Testo overlay
    if request.text_overlay:
        text_pos = get_text_position_filter(request.text_position)
        # Escape caratteri speciali per FFmpeg
        escaped_text = request.text_overlay.replace("'", "'\\''").replace(":", "\\:")
        text_filter = (
            f"{current_stream}drawtext="
            f"text='{escaped_text}':"
            f"fontsize={request.text_font_size}:"
            f"fontcolor=white:"
            f"borderw=3:"
            f"bordercolor=black:"
            f"{text_pos}"
            f"[texted]"
        )
        filter_complex.append(text_filter)
        current_stream = "[texted]"
    
    # Applica filtri
    if filter_complex:
        # Rinomina l'ultimo stream in output
        last_filter = filter_complex[-1]
        # Rimuovi il nome dello stream di output dall'ultimo filtro
        last_output_name = last_filter.split("[")[-1].rstrip("]")
        cmd.extend(["-filter_complex", ";".join(filter_complex)])
        cmd.extend(["-map", f"[{last_output_name}]"])
    else:
        cmd.extend(["-c:v", "copy"])
    
    # Gestione audio
    if request.audio_id:
        audio_path = ASSETS_DIR / "audio" / request.audio_id
        if audio_path.exists():
            cmd.extend(["-i", str(audio_path)])
            # Usa l'audio custom invece dell'originale
            audio_input_index = 2 if request.overlay_id else 1
            cmd.extend(["-map", f"{audio_input_index}:a"])
            cmd.extend(["-shortest"])
        elif not request.remove_original_audio:
            cmd.extend(["-map", "0:a?"])
    elif request.remove_original_audio:
        cmd.extend(["-an"])
    else:
        cmd.extend(["-map", "0:a?"])
    
    # Output settings
    cmd.extend([
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        str(output_path)
    ])
    
    try:
        await run_ffmpeg(cmd)
        
        return ProcessResponse(
            success=True,
            output_filename=output_filename,
            output_url=f"/output/{output_filename}",
            message="Video processato con successo!"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Carica un video direttamente invece di scaricarlo da URL"""
    video_id = str(uuid.uuid4())[:8]
    
    # Mantieni l'estensione originale
    ext = Path(file.filename).suffix or ".mp4"
    filename = f"{video_id}{ext}"
    file_path = TEMP_DIR / filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "success": True,
            "video_id": video_id,
            "filename": filename,
            "message": "Video caricato con successo!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cleanup/{video_id}")
async def cleanup_video(video_id: str):
    """Pulisce i file temporanei di un video"""
    deleted = []
    for dir_path in [TEMP_DIR, OUTPUT_DIR]:
        for file_path in dir_path.glob(f"*{video_id}*"):
            file_path.unlink()
            deleted.append(str(file_path))
    
    return {"deleted": deleted}
