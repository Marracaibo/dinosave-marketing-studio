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

class OverlayItem(BaseModel):
    """Singolo overlay da applicare al video"""
    id: str
    x: float = 70  # Percentuale 0-100 dalla sinistra
    y: float = 70  # Percentuale 0-100 dall'alto
    scale: float = 0.25  # % della larghezza video
    remove_green_screen: bool = True
    remove_black_screen: bool = False

class ProcessRequest(BaseModel):
    video_id: str
    # Supporto overlay multipli
    overlays: Optional[List[OverlayItem]] = None
    # Legacy single overlay (retrocompatibilità)
    overlay_id: Optional[str] = None
    overlay_position: str = "bottom-right"
    overlay_x: Optional[float] = None
    overlay_y: Optional[float] = None
    overlay_scale: float = 0.25
    remove_green_screen: bool = True
    remove_black_screen: bool = False
    audio_id: Optional[str] = None
    remove_original_audio: bool = False
    text_overlay: Optional[str] = None
    text_position: str = "top-center"
    text_x: Optional[float] = None  # Percentuale 0-100
    text_y: Optional[float] = None  # Percentuale 0-100
    text_font_size: int = 48
    # Video editing
    trim_start: float = 0  # Secondi dall'inizio
    trim_end: Optional[float] = None  # Secondi, None = fine video
    brightness: int = 0  # -50 a 50
    contrast: int = 0  # -50 a 50
    saturation: int = 0  # -50 a 50
    playback_speed: float = 1.0  # 0.5 a 2.0

class ProcessResponse(BaseModel):
    success: bool
    output_filename: str
    output_url: str
    message: str

def get_position_filter(position: str, video_w: str = "main_w", video_h: str = "main_h", overlay_w: str = "overlay_w", overlay_h: str = "overlay_h", margin: int = 20):
    """Calcola la posizione FFmpeg per l'overlay (fallback)"""
    positions = {
        "top-left": f"{margin}:{margin}",
        "top-right": f"{video_w}-{overlay_w}-{margin}:{margin}",
        "bottom-left": f"{margin}:{video_h}-{overlay_h}-{margin}",
        "bottom-right": f"{video_w}-{overlay_w}-{margin}:{video_h}-{overlay_h}-{margin}",
        "center": f"({video_w}-{overlay_w})/2:({video_h}-{overlay_h})/2",
    }
    return positions.get(position, positions["bottom-right"])

def get_position_from_percent(x_percent: float, y_percent: float):
    """Calcola la posizione FFmpeg da coordinate percentuali (0-100)"""
    # Usa main_w e main_h per riferirsi al video principale nel filtro overlay
    x = f"(main_w*{x_percent/100})"
    y = f"(main_h*{y_percent/100})"
    return f"{x}:{y}"

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

def get_video_dimensions(video_path: str) -> tuple:
    """Ottiene le dimensioni del video usando ffprobe"""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0", video_path],
            capture_output=True, text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split(',')
            return int(parts[0]), int(parts[1])
    except Exception as e:
        print(f"[WARN] Could not get video dimensions: {e}")
    return 1080, 1920  # Default 9:16 portrait

async def run_ffmpeg(cmd: List[str]):
    """Esegue FFmpeg in modo asincrono"""
    # Log comando per debug
    print(f"[FFmpeg CMD] {' '.join(cmd)}")
    
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
        print(f"[FFmpeg ERROR] {result.stderr}")
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
    
    # Ottieni dimensioni video per calcolare scala overlay
    video_width, video_height = get_video_dimensions(str(source_path))
    print(f"[DEBUG] Video dimensions: {video_width}x{video_height}")
    
    # Costruisci il comando FFmpeg
    cmd = [FFMPEG_PATH, "-y"]
    
    # Trim: seek to start
    if request.trim_start > 0:
        cmd.extend(["-ss", str(request.trim_start)])
    
    cmd.extend(["-i", str(source_path)])
    
    # Calcola durata trim (applicata alla fine)
    trim_duration = None
    if request.trim_end and request.trim_end > request.trim_start:
        trim_duration = request.trim_end - request.trim_start
    
    filter_complex = []
    current_stream = "[0:v]"
    
    # Video filters (brightness, contrast, saturation, speed)
    video_filters = []
    
    # Brightness/Contrast/Saturation usando eq filter
    if request.brightness != 0 or request.contrast != 0 or request.saturation != 0:
        # FFmpeg eq: brightness va da -1 a 1, contrast da 0.5 a 1.5, saturation da 0 a 3
        brightness = request.brightness / 100  # -0.5 a 0.5
        contrast = 1 + (request.contrast / 100)  # 0.5 a 1.5
        saturation = 1 + (request.saturation / 50)  # 0 a 2
        video_filters.append(f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}")
    
    # Playback speed
    if request.playback_speed != 1.0:
        video_filters.append(f"setpts={1/request.playback_speed}*PTS")
    
    # Applica filtri video base
    if video_filters:
        combined = ",".join(video_filters)
        filter_complex.append(f"[0:v]{combined}[vbase]")
        current_stream = "[vbase]"
    
    # Prepara lista overlay (supporta sia array che singolo per retrocompatibilità)
    overlay_list = []
    if request.overlays:
        overlay_list = request.overlays
    elif request.overlay_id:
        # Legacy: converti singolo overlay in lista
        overlay_list = [OverlayItem(
            id=request.overlay_id,
            x=request.overlay_x if request.overlay_x is not None else 70,
            y=request.overlay_y if request.overlay_y is not None else 70,
            scale=request.overlay_scale,
            remove_green_screen=request.remove_green_screen,
            remove_black_screen=request.remove_black_screen
        )]
    
    # Processa ogni overlay
    overlay_input_idx = 1  # Indice input FFmpeg (0 è il video principale)
    for idx, overlay_item in enumerate(overlay_list):
        # Trova il file overlay
        overlay_path = ASSETS_DIR / "overlays" / overlay_item.id
        if not overlay_path.exists():
            for ext in ['.mov', '.mp4', '.webm', '.gif', '.png']:
                test_path = ASSETS_DIR / "overlays" / f"{overlay_item.id}{ext}"
                if test_path.exists():
                    overlay_path = test_path
                    break
            if not overlay_path.exists():
                for file in (ASSETS_DIR / "overlays").iterdir():
                    if file.stem == overlay_item.id:
                        overlay_path = file
                        break
        
        if overlay_path.exists():
            cmd.extend(["-i", str(overlay_path)])
            
            overlay_ext = overlay_path.suffix.lower()
            has_native_alpha = overlay_ext in ['.webm', '.mov', '.png', '.gif']
            
            print(f"[DEBUG] Overlay {idx}: {overlay_path.name}, pos: ({overlay_item.x}, {overlay_item.y}), scale: {overlay_item.scale}")
            
            overlay_target_width = int(video_width * overlay_item.scale)
            input_ref = f"[{overlay_input_idx}:v]"
            scaled_name = f"overlay_scaled_{idx}"
            
            # Scala overlay con gestione trasparenza
            if overlay_item.remove_green_screen:
                chroma_name = f"chroma_{idx}"
                filter_complex.append(f"{input_ref}chromakey=0x00FF00:0.3:0.1,format=rgba[{chroma_name}]")
                filter_complex.append(f"[{chroma_name}]scale={overlay_target_width}:-1:flags=lanczos[{scaled_name}]")
            elif overlay_item.remove_black_screen:
                colorkey_name = f"colorkey_{idx}"
                filter_complex.append(f"{input_ref}colorkey=0x000000:0.3:0.2,format=rgba[{colorkey_name}]")
                filter_complex.append(f"[{colorkey_name}]scale={overlay_target_width}:-1:flags=lanczos[{scaled_name}]")
            elif has_native_alpha:
                filter_complex.append(f"{input_ref}format=rgba,scale={overlay_target_width}:-1:flags=lanczos[{scaled_name}]")
            else:
                filter_complex.append(f"{input_ref}scale={overlay_target_width}:-1:flags=lanczos[{scaled_name}]")
            
            # Posizione overlay
            pos = get_position_from_percent(overlay_item.x, overlay_item.y)
            output_name = f"overlaid_{idx}"
            overlay_filter = f"{current_stream}[{scaled_name}]overlay={pos}:eof_action=repeat:format=auto[{output_name}]"
            filter_complex.append(overlay_filter)
            current_stream = f"[{output_name}]"
            overlay_input_idx += 1
    
    # Testo overlay
    if request.text_overlay:
        # Usa coordinate custom se fornite, altrimenti usa preset
        if request.text_x is not None and request.text_y is not None:
            text_pos = f"x=(w*{request.text_x/100}-text_w/2):y=(h*{request.text_y/100}-text_h/2)"
        else:
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
    audio_filter = None
    if request.playback_speed != 1.0:
        # Modifica velocità audio per matchare il video
        audio_filter = f"atempo={request.playback_speed}"
    
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
            if audio_filter:
                cmd.extend(["-af", audio_filter])
    elif request.remove_original_audio:
        cmd.extend(["-an"])
    else:
        cmd.extend(["-map", "0:a?"])
        if audio_filter:
            cmd.extend(["-af", audio_filter])
    
    # Output settings - ottimizzato per bassa memoria (Render free tier 512MB)
    # Output settings
    cmd.extend([
        "-threads", "1",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        "-crf", "28",
        "-maxrate", "2M",
        "-bufsize", "1M",
        "-movflags", "+faststart",
        "-c:a", "aac",
        "-b:a", "96k",
    ])
    
    # Trim duration - DEVE essere prima dell'output file
    if trim_duration:
        cmd.extend(["-t", str(trim_duration)])
        print(f"[DEBUG] Trim duration: {trim_duration}s")
    
    cmd.append(str(output_path))
    
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
