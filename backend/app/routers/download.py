from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yt_dlp
import os
import uuid
from pathlib import Path
import asyncio
from typing import Optional

router = APIRouter()

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

class DownloadRequest(BaseModel):
    url: str
    remove_watermark: bool = True

class DownloadResponse(BaseModel):
    success: bool
    video_id: str
    filename: str
    duration: Optional[float] = None
    thumbnail: Optional[str] = None
    title: Optional[str] = None
    message: str

def get_yt_dlp_options(video_id: str):
    """Configura yt-dlp con opzioni ottimizzate per TikTok/Instagram"""
    return {
        'format': 'best[ext=mp4]/best',
        'outtmpl': str(TEMP_DIR / f'{video_id}.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        # User agent per evitare blocchi
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-us,en;q=0.5',
        },
        # TikTok: usa API mobile per evitare watermark
        'extractor_args': {
            'tiktok': {
                'api_hostname': 'api22-normal-c-useast2a.tiktokv.com',
            }
        },
    }

async def download_video_async(url: str, video_id: str) -> dict:
    """Scarica video in modo asincrono usando yt-dlp"""
    options = get_yt_dlp_options(video_id)
    
    def _download():
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=True)
            return info
    
    loop = asyncio.get_event_loop()
    info = await loop.run_in_executor(None, _download)
    return info

@router.post("/", response_model=DownloadResponse)
async def download_video(request: DownloadRequest):
    """
    Scarica un video da TikTok, Instagram, YouTube, etc.
    Usa yt-dlp con configurazione ottimizzata.
    """
    video_id = str(uuid.uuid4())[:8]
    
    try:
        info = await download_video_async(request.url, video_id)
        
        # Trova il file scaricato
        downloaded_files = list(TEMP_DIR.glob(f"{video_id}.*"))
        if not downloaded_files:
            raise HTTPException(status_code=500, detail="Download fallito: file non trovato")
        
        filename = downloaded_files[0].name
        
        return DownloadResponse(
            success=True,
            video_id=video_id,
            filename=filename,
            duration=info.get('duration'),
            thumbnail=info.get('thumbnail'),
            title=info.get('title', 'Video'),
            message="Video scaricato con successo!"
        )
        
    except yt_dlp.DownloadError as e:
        error_msg = str(e)
        if "Sign in" in error_msg or "login" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Questo video richiede login. Prova con un video pubblico.")
        raise HTTPException(status_code=400, detail=f"Errore download: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")

@router.get("/preview/{video_id}")
async def get_video_preview(video_id: str):
    """Serve il file video per l'anteprima"""
    from fastapi.responses import FileResponse
    
    # Cerca il file con qualsiasi estensione
    files = list(TEMP_DIR.glob(f"{video_id}.*"))
    if not files:
        raise HTTPException(status_code=404, detail="Video non trovato")
    
    file_path = files[0]
    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=file_path.name
    )

@router.get("/info")
async def get_video_info(url: str):
    """Ottiene info sul video"""
    return {
        "title": "Video",
        "duration": None,
        "thumbnail": None,
        "uploader": None,
        "platform": "unknown"
    }
