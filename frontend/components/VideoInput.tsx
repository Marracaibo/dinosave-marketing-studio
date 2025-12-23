'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Link, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { VideoState } from '@/app/page'

interface VideoInputProps {
  video: VideoState
  setVideo: React.Dispatch<React.SetStateAction<VideoState>>
  setOutputUrl: React.Dispatch<React.SetStateAction<string | null>>
}

export default function VideoInput({ video, setVideo, setOutputUrl }: VideoInputProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'url' | 'upload'>('url')

  const handleDownload = async () => {
    if (!url.trim()) {
      toast.error('Inserisci un URL valido')
      return
    }

    setIsLoading(true)
    setOutputUrl(null)

    try {
      const response = await fetch('/api/download/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, remove_watermark: true }),
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMsg = 'Errore durante il download'
        try {
          const data = JSON.parse(text)
          errorMsg = data.detail || errorMsg
        } catch {
          errorMsg = text || errorMsg
        }
        throw new Error(errorMsg)
      }

      const data = await response.json()

      setVideo({
        videoId: data.video_id,
        filename: data.filename,
        previewUrl: `/api/download/preview/${data.video_id}`,
        title: data.title,
        duration: data.duration,
      })

      toast.success('Video scaricato con successo!')
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il download')
    } finally {
      setIsLoading(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsLoading(true)
    setOutputUrl(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/process/upload-video', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante l\'upload')
      }

      // Create local preview URL
      const previewUrl = URL.createObjectURL(file)

      setVideo({
        videoId: data.video_id,
        filename: data.filename,
        previewUrl,
        title: file.name,
        duration: null,
      })

      toast.success('Video caricato con successo!')
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'upload')
    } finally {
      setIsLoading(false)
    }
  }, [setVideo, setOutputUrl])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv']
    },
    maxFiles: 1,
    disabled: isLoading,
  })

  const clearVideo = () => {
    setVideo({
      videoId: null,
      filename: null,
      previewUrl: null,
      title: null,
      duration: null,
    })
    setOutputUrl(null)
    setUrl('')
  }

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('url')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-medium transition-all text-sm sm:text-base min-h-[48px] ${
            mode === 'url'
              ? 'bg-primary-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20 active:bg-white/30'
          }`}
        >
          <Link className="w-4 h-4 inline mr-1 sm:mr-2" />
          Da Link
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-medium transition-all text-sm sm:text-base min-h-[48px] ${
            mode === 'upload'
              ? 'bg-primary-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20 active:bg-white/30'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-1 sm:mr-2" />
          Upload
        </button>
      </div>

      {/* URL Input Mode */}
      {mode === 'url' && (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Incolla link TikTok o Instagram..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isLoading}
            />
            {url && (
              <button
                onClick={() => setUrl('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleDownload}
            disabled={isLoading || !url.trim()}
            className="w-full bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scaricando...
              </>
            ) : (
              <>
                <Link className="w-5 h-5" />
                Scarica Video
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragActive
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-white/20 hover:border-primary-500/50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
              <p className="text-gray-300">Caricando...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-gray-300">
                {isDragActive
                  ? 'Rilascia il video qui...'
                  : 'Trascina un video o clicca per selezionare'}
              </p>
              <p className="text-gray-500 text-sm">
                MP4, MOV, AVI, WebM (max 100MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Video Info */}
      {video.videoId && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              ✓
            </div>
            <div>
              <p className="text-green-400 font-medium text-sm">Video pronto</p>
              <p className="text-gray-400 text-xs truncate max-w-[200px]">
                {video.title || video.filename}
              </p>
            </div>
          </div>
          <button
            onClick={clearVideo}
            className="text-gray-400 hover:text-red-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
