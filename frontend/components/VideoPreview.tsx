'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Download, CheckCircle, Move, Maximize2 } from 'lucide-react'
import type { VideoState, EditSettings } from '@/app/page'
import { apiUrl } from '@/lib/api'

interface VideoPreviewProps {
  video: VideoState
  outputUrl: string | null
  settings: EditSettings
  updateSettings?: (updates: Partial<EditSettings>) => void
}

interface OverlayInfo {
  id: string
  filename: string
  url: string
  type: string
}

export default function VideoPreview({ video, outputUrl, settings, updateSettings }: VideoPreviewProps) {
  const [showOriginal, setShowOriginal] = useState(true)
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [overlayType, setOverlayType] = useState<string>('video')
  const [allOverlays, setAllOverlays] = useState<OverlayInfo[]>([])
  
  // Drag & resize state - inizializza dalle settings
  const [overlayPos, setOverlayPos] = useState({ x: settings.overlayX ?? 70, y: settings.overlayY ?? 70 })
  const [overlaySize, setOverlaySize] = useState(settings.overlayScale * 100)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [draggingOverlayIdx, setDraggingOverlayIdx] = useState<number | null>(null) // Per overlay già aggiunti
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const currentUrl = showOriginal ? video.previewUrl : outputUrl
  const hasOutput = !!outputUrl

  // Sync size with settings
  useEffect(() => {
    setOverlaySize(settings.overlayScale * 100)
  }, [settings.overlayScale])

  // Sync playback speed with video
  useEffect(() => {
    if (videoRef.current && showOriginal) {
      videoRef.current.playbackRate = settings.playbackSpeed
    }
  }, [settings.playbackSpeed, showOriginal])

  // Carica tutti gli overlay disponibili
  useEffect(() => {
    fetch(apiUrl('/api/assets/overlays'))
      .then(res => res.json())
      .then(data => {
        setAllOverlays(data.overlays || [])
      })
      .catch(() => setAllOverlays([]))
  }, [settings.overlays.length])

  // Carica l'URL dell'overlay selezionato
  useEffect(() => {
    if (settings.overlayId) {
      fetch(apiUrl('/api/assets/overlays'))
        .then(res => res.json())
        .then(data => {
          const overlay = data.overlays?.find((o: OverlayInfo) => o.id === settings.overlayId)
          if (overlay) {
            setOverlayUrl(overlay.url)
            setOverlayType(overlay.type || 'video')
          }
        })
        .catch(() => {
          setOverlayUrl(null)
          setOverlayType('video')
        })
    } else {
      setOverlayUrl(null)
      setOverlayType('video')
    }
  }, [settings.overlayId])

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: overlayPos.x,
      posY: overlayPos.y
    }
  }, [overlayPos])

  // Handle drag per overlay già aggiunti
  const handleAddedOverlayDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingOverlayIdx(idx)
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const item = settings.overlays[idx]
    
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: item.x,
      posY: item.y
    }
  }, [settings.overlays])

  // Handle drag move
  useEffect(() => {
    if (!isDragging && !isResizing && draggingOverlayIdx === null) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const rect = containerRef.current.getBoundingClientRect()
      
      if (isDragging) {
        const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100
        const deltaY = ((clientY - dragStartRef.current.y) / rect.height) * 100
        
        const newX = Math.max(0, Math.min(100 - overlaySize, dragStartRef.current.posX + deltaX))
        const newY = Math.max(0, Math.min(85, dragStartRef.current.posY + deltaY))
        
        setOverlayPos({ x: newX, y: newY })
        
        // Sincronizza con le settings per passare al backend
        if (updateSettings) {
          updateSettings({ overlayX: newX, overlayY: newY })
        }
      }
      
      // Drag overlay già aggiunto
      if (draggingOverlayIdx !== null && updateSettings) {
        const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100
        const deltaY = ((clientY - dragStartRef.current.y) / rect.height) * 100
        
        const item = settings.overlays[draggingOverlayIdx]
        const newX = Math.max(0, Math.min(100 - (item.scale * 100), dragStartRef.current.posX + deltaX))
        const newY = Math.max(0, Math.min(85, dragStartRef.current.posY + deltaY))
        
        const newOverlays = [...settings.overlays]
        newOverlays[draggingOverlayIdx] = { ...item, x: newX, y: newY }
        updateSettings({ overlays: newOverlays })
      }
      
      if (isResizing) {
        const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100
        const newSize = Math.max(10, Math.min(60, dragStartRef.current.posX + deltaX))
        setOverlaySize(newSize)
        
        // Aggiorna le settings
        if (updateSettings) {
          updateSettings({ overlayScale: newSize / 100 })
        }
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
      setIsResizing(false)
      setDraggingOverlayIdx(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, isResizing, overlaySize, updateSettings])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    
    dragStartRef.current = {
      x: clientX,
      y: 0,
      posX: overlaySize,
      posY: 0
    }
  }, [overlaySize])

  const handleDownload = () => {
    if (outputUrl) {
      const link = document.createElement('a')
      link.href = outputUrl
      link.download = `remix_${video.videoId}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      {hasOutput && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowOriginal(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              showOriginal
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Originale
          </button>
          <button
            onClick={() => setShowOriginal(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              !showOriginal
                ? 'bg-green-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Remixato
          </button>
        </div>
      )}

      {/* Video Player con Overlay Preview */}
      <div 
        ref={containerRef}
        className="relative aspect-[9/16] max-h-[500px] bg-black/50 rounded-xl overflow-hidden"
      >
        {currentUrl ? (
          <>
            <video
              ref={videoRef}
              key={currentUrl}
              src={currentUrl}
              controls
              className="w-full h-full object-contain"
              playsInline
              style={showOriginal ? {
                filter: `brightness(${1 + settings.brightness / 100}) contrast(${1 + settings.contrast / 100}) saturate(${1 + settings.saturation / 50})`,
              } : undefined}
            />
            {/* Live Overlay Preview - Draggable & Resizable */}
            {showOriginal && overlayUrl && (
              <div 
                className={`absolute cursor-move select-none ${isDragging ? 'opacity-80' : ''}`}
                style={{ 
                  left: `${overlayPos.x}%`,
                  top: `${overlayPos.y}%`,
                  width: `${overlaySize}%`,
                  maxWidth: '60%'
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                {/* Overlay Video or Image */}
                {overlayType === 'video' ? (
                  <video
                    src={overlayUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto pointer-events-none"
                  />
                ) : (
                  <img
                    src={overlayUrl}
                    alt="Overlay"
                    className="w-full h-auto pointer-events-none"
                  />
                )}
                {/* Resize Handle */}
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 bg-white/30 rounded-tl-lg cursor-se-resize flex items-center justify-center hover:bg-white/50 transition-colors"
                  onMouseDown={handleResizeStart}
                  onTouchStart={handleResizeStart}
                >
                  <Maximize2 className="w-3 h-3 text-white" />
                </div>
                {/* Drag indicator */}
                <div className="absolute top-0 left-0 w-6 h-6 bg-white/30 rounded-br-lg flex items-center justify-center">
                  <Move className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
            {/* Multi-Overlay Preview (overlay già aggiunti - TRASCINABILI) */}
            {showOriginal && settings.overlays.map((item, idx) => {
              const overlayInfo = allOverlays.find((o: any) => o.id === item.id)
              if (!overlayInfo) return null
              return (
                <div 
                  key={idx}
                  className={`absolute cursor-move select-none ${draggingOverlayIdx === idx ? 'opacity-90 z-20' : 'z-10'}`}
                  style={{ 
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${item.scale * 100}%`,
                    maxWidth: '60%'
                  }}
                  onMouseDown={(e) => handleAddedOverlayDragStart(e, idx)}
                  onTouchStart={(e) => handleAddedOverlayDragStart(e, idx)}
                >
                  {overlayInfo.type === 'video' ? (
                    <video src={overlayInfo.url} autoPlay loop muted playsInline className="w-full h-auto pointer-events-none" />
                  ) : (
                    <img src={overlayInfo.url} alt="Overlay" className="w-full h-auto pointer-events-none" />
                  )}
                  <div className="absolute top-0 left-0 bg-primary-500/80 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    #{idx + 1}
                  </div>
                </div>
              )
            })}
            {/* Text Overlay Preview */}
            {showOriginal && settings.textOverlay && (
              <div 
                className={`absolute pointer-events-none px-3 py-1 ${
                  settings.textPosition === 'top-left' ? 'top-2 left-2' :
                  settings.textPosition === 'top-center' ? 'top-2 left-1/2 -translate-x-1/2' :
                  settings.textPosition === 'top-right' ? 'top-2 right-2' :
                  settings.textPosition === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                  'bottom-12 left-1/2 -translate-x-1/2'
                }`}
              >
                <span 
                  className="text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  style={{ fontSize: `${Math.min(settings.textFontSize / 2, 24)}px` }}
                >
                  {settings.textOverlay}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nessuna anteprima disponibile</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-400">
          {video.title && <span className="block truncate">{video.title}</span>}
          {video.duration && (
            <span className="text-gray-500">
              Durata: {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      {/* Download Button */}
      {hasOutput && (
        <button
          onClick={handleDownload}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Scarica Video Remixato
        </button>
      )}
    </div>
  )
}
