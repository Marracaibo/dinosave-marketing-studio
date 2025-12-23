'use client'

import { Wand2, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { VideoState, EditSettings } from '@/app/page'

interface ProcessButtonProps {
  video: VideoState
  settings: EditSettings
  isProcessing: boolean
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>
  setOutputUrl: React.Dispatch<React.SetStateAction<string | null>>
}

export default function ProcessButton({
  video,
  settings,
  isProcessing,
  setIsProcessing,
  setOutputUrl,
}: ProcessButtonProps) {
  const hasVideo = !!video.videoId
  const hasEdits = settings.overlayId || settings.audioId || settings.textOverlay || settings.removeOriginalAudio

  const handleProcess = async () => {
    if (!video.videoId) {
      toast.error('Carica prima un video!')
      return
    }

    setIsProcessing(true)
    setOutputUrl(null)

    try {
      const response = await fetch('/api/process/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: video.videoId,
          overlay_id: settings.overlayId,
          overlay_position: settings.overlayPosition,
          overlay_scale: settings.overlayScale,
          audio_id: settings.audioId,
          remove_original_audio: settings.removeOriginalAudio,
          text_overlay: settings.textOverlay || null,
          text_position: settings.textPosition,
          text_font_size: settings.textFontSize,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante il processing')
      }

      setOutputUrl(data.output_url)
      toast.success('Video remixato con successo! 🎉')
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il processing')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Warning if no edits */}
      {hasVideo && !hasEdits && (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200">
            Non hai ancora aggiunto modifiche. Aggiungi overlay, audio o testo per remixare il video.
          </p>
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={!hasVideo || isProcessing}
        className={`w-full py-4 px-4 sm:px-6 rounded-xl font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-2 sm:gap-3 min-h-[56px] ${
          isProcessing
            ? 'bg-gray-600 cursor-wait'
            : hasVideo
            ? 'bg-gradient-to-r from-primary-600 via-purple-600 to-accent-600 hover:opacity-90 active:opacity-80 glow-primary'
            : 'bg-gray-700 cursor-not-allowed opacity-50'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            <span className="hidden sm:inline">Sto remixando il video...</span>
            <span className="sm:hidden">Remixando...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5 sm:w-6 sm:h-6" />
            Remixa il Video 🦖
          </>
        )}
      </button>

      {/* Processing info */}
      {isProcessing && (
        <p className="text-center text-sm text-gray-400">
          Questo potrebbe richiedere qualche secondo...
        </p>
      )}
    </div>
  )
}
