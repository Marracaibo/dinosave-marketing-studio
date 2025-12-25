'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Check, Move, Wand2, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { EditSettings, OverlayItem } from '@/app/page'
import { apiUrl } from '@/lib/api'

interface Overlay {
  id: string
  filename: string
  url: string
  type: string
}

interface OverlaySelectorProps {
  settings: EditSettings
  updateSettings: (updates: Partial<EditSettings>) => void
}

const POSITIONS = [
  { value: 'top-left', label: 'Alto SX' },
  { value: 'top-right', label: 'Alto DX' },
  { value: 'bottom-left', label: 'Basso SX' },
  { value: 'bottom-right', label: 'Basso DX' },
  { value: 'center', label: 'Centro' },
] as const

export default function OverlaySelector({ settings, updateSettings }: OverlaySelectorProps) {
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchOverlays = async () => {
    try {
      const response = await fetch(apiUrl('/api/assets/overlays'))
      const data = await response.json()
      setOverlays(data.overlays || [])
    } catch (error) {
      console.error('Errore nel caricamento overlays:', error)
    }
  }

  useEffect(() => {
    fetchOverlays()
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(apiUrl('/api/assets/overlays/upload'), {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload fallito')

      toast.success('Overlay caricato!')
      fetchOverlays()
    } catch (error) {
      toast.error('Errore durante l\'upload')
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/assets/overlays/${id}`), { method: 'DELETE' })
      if (settings.overlayId === id) {
        updateSettings({ overlayId: null })
      }
      fetchOverlays()
      toast.success('Overlay eliminato')
    } catch (error) {
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const handleRemoveBackground = async (id: string) => {
    setIsLoading(true)
    const loadingToast = toast.loading('Rimuovo lo sfondo con AI...')
    
    try {
      const response = await fetch(apiUrl(`/api/assets/overlays/${id}/remove-background`), {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante la rimozione sfondo')
      }
      
      toast.dismiss(loadingToast)
      toast.success('Sfondo rimosso! Nuovo overlay creato')
      fetchOverlays()
      // Seleziona automaticamente il nuovo overlay senza sfondo
      updateSettings({ overlayId: data.id })
    } catch (error: any) {
      toast.dismiss(loadingToast)
      toast.error(error.message || 'Errore durante la rimozione sfondo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Overlay Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* None Option */}
        <button
          onClick={() => updateSettings({ overlayId: null })}
          className={`aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
            settings.overlayId === null
              ? 'border-primary-500 bg-primary-500/20'
              : 'border-white/20 hover:border-white/40'
          }`}
        >
          <span className="text-2xl">🚫</span>
          <span className="text-xs text-gray-400">Nessuno</span>
        </button>

        {/* Overlay Items */}
        {overlays.map((overlay) => (
          <div key={overlay.id} className="relative group">
            <button
              onClick={() => updateSettings({ overlayId: overlay.id })}
              className={`aspect-square w-full rounded-xl border-2 transition-all overflow-hidden ${
                settings.overlayId === overlay.id
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              {overlay.type === 'video' ? (
                <video
                  src={overlay.url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={overlay.url}
                  alt={overlay.filename}
                  className="w-full h-full object-cover"
                />
              )}
              {settings.overlayId === overlay.id && (
                <div className="absolute inset-0 bg-primary-500/30 flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
              )}
            </button>
            <button
              onClick={() => handleDelete(overlay.id)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Elimina"
            >
              <Trash2 className="w-3 h-3 text-white" />
            </button>
            {/* Remove Background Button - per tutti gli overlay */}
            {!overlay.id.endsWith('_nobg') && (
              <button
                onClick={() => handleRemoveBackground(overlay.id)}
                className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Rimuovi sfondo (AI)"
                disabled={isLoading}
              >
                <Wand2 className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        ))}

        {/* Upload Button */}
        <label
          className={`aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-primary-500/50 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
            isLoading ? 'opacity-50' : ''
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mov,.mp4,.webm,.gif,.png"
            className="hidden"
            onChange={handleUpload}
            disabled={isLoading}
          />
          <Upload className="w-6 h-6 text-gray-400" />
          <span className="text-xs text-gray-400">Carica</span>
        </label>
      </div>

      {/* Aggiungi Overlay al Video */}
      {settings.overlayId && (
        <div className="pt-3 border-t border-white/10">
          <button
            onClick={() => {
              const newOverlay: OverlayItem = {
                id: settings.overlayId!,
                x: settings.overlayX,
                y: settings.overlayY,
                scale: settings.overlayScale,
                removeGreenScreen: settings.removeGreenScreen,
                removeBlackScreen: settings.removeBlackScreen,
              }
              updateSettings({ 
                overlays: [...settings.overlays, newOverlay],
                overlayId: null // Reset selezione
              })
              toast.success('Overlay aggiunto! 🦖')
            }}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Aggiungi al Video
          </button>
          
          {/* Scale */}
          <div className="mt-3">
            <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Dimensione</span>
              <span className="text-primary-400">{Math.round(settings.overlayScale * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={settings.overlayScale}
              onChange={(e) => updateSettings({ overlayScale: parseFloat(e.target.value) })}
              className="w-full accent-primary-500"
            />
          </div>

          {/* Remove Green Screen */}
          <div className="flex items-center justify-between mt-3">
            <label className="text-sm text-gray-400">Rimuovi sfondo verde</label>
            <button
              onClick={() => updateSettings({ removeGreenScreen: !settings.removeGreenScreen, removeBlackScreen: false })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.removeGreenScreen ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.removeGreenScreen ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Remove Black Screen */}
          <div className="flex items-center justify-between mt-2">
            <label className="text-sm text-gray-400">Rimuovi sfondo nero</label>
            <button
              onClick={() => updateSettings({ removeBlackScreen: !settings.removeBlackScreen, removeGreenScreen: false })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.removeBlackScreen ? 'bg-gray-800 ring-2 ring-white' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.removeBlackScreen ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Lista Overlay Aggiunti */}
      {settings.overlays.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <label className="text-sm text-gray-400 mb-2 block">
            Overlay nel video ({settings.overlays.length})
          </label>
          <div className="space-y-2">
            {settings.overlays.map((item, idx) => {
              const overlay = overlays.find(o => o.id === item.id)
              return (
                <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    {overlay?.type === 'video' ? (
                      <video src={overlay.url} className="w-full h-full object-cover" muted />
                    ) : overlay ? (
                      <img src={overlay.url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{overlay?.filename || item.id}</p>
                    <p className="text-xs text-gray-500">
                      Pos: {Math.round(item.x)}%, {Math.round(item.y)}% | Scala: {Math.round(item.scale * 100)}%
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newOverlays = settings.overlays.filter((_, i) => i !== idx)
                      updateSettings({ overlays: newOverlays })
                    }}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              )
            })}
          </div>
          {settings.overlays.length > 0 && (
            <button
              onClick={() => updateSettings({ overlays: [] })}
              className="mt-2 w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              Rimuovi tutti
            </button>
          )}
        </div>
      )}
    </div>
  )
}
