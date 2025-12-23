'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Check, Volume2, VolumeX, Play, Pause } from 'lucide-react'
import toast from 'react-hot-toast'
import type { EditSettings } from '@/app/page'
import { apiUrl } from '@/lib/api'

interface AudioFile {
  id: string
  filename: string
  url: string
}

interface AudioSelectorProps {
  settings: EditSettings
  updateSettings: (updates: Partial<EditSettings>) => void
}

export default function AudioSelector({ settings, updateSettings }: AudioSelectorProps) {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchAudio = async () => {
    try {
      const response = await fetch(apiUrl('/api/assets/audio'))
      const data = await response.json()
      setAudioFiles(data.audio || [])
    } catch (error) {
      console.error('Errore nel caricamento audio:', error)
    }
  }

  useEffect(() => {
    fetchAudio()
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(apiUrl('/api/assets/audio/upload'), {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload fallito')

      toast.success('Audio caricato!')
      fetchAudio()
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
      await fetch(`/api/assets/audio/${id}`, { method: 'DELETE' })
      if (settings.audioId === id) {
        updateSettings({ audioId: null })
      }
      fetchAudio()
      toast.success('Audio eliminato')
    } catch (error) {
      toast.error('Errore durante l\'eliminazione')
    }
  }

  const togglePlay = (audio: AudioFile) => {
    if (playingId === audio.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(audio.url)
      audioRef.current.play()
      audioRef.current.onended = () => setPlayingId(null)
      setPlayingId(audio.id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Remove Original Audio Toggle */}
      <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
        <div className="flex items-center gap-3">
          <VolumeX className="w-5 h-5 text-gray-400" />
          <span className="text-sm">Rimuovi audio originale</span>
        </div>
        <div className="relative">
          <input
            type="checkbox"
            checked={settings.removeOriginalAudio}
            onChange={(e) => updateSettings({ removeOriginalAudio: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </div>
      </label>

      {/* Audio List */}
      <div className="space-y-2">
        {/* None Option */}
        <button
          onClick={() => updateSettings({ audioId: null })}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
            settings.audioId === null
              ? 'border-primary-500 bg-primary-500/20'
              : 'border-white/10 hover:border-white/30'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            🔇
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">Nessun audio custom</p>
            <p className="text-xs text-gray-500">Usa audio originale o rimuovilo</p>
          </div>
          {settings.audioId === null && <Check className="w-5 h-5 text-primary-400" />}
        </button>

        {/* Audio Files */}
        {audioFiles.map((audio) => (
          <div
            key={audio.id}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
              settings.audioId === audio.id
                ? 'border-primary-500 bg-primary-500/20'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <button
              onClick={() => togglePlay(audio)}
              className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
            >
              {playingId === audio.id ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => updateSettings({ audioId: audio.id })}
              className="flex-1 text-left"
            >
              <p className="text-sm font-medium truncate">{audio.filename}</p>
            </button>
            {settings.audioId === audio.id && (
              <Check className="w-5 h-5 text-primary-400" />
            )}
            <button
              onClick={() => handleDelete(audio.id)}
              className="text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Upload Button */}
      <label
        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/20 hover:border-primary-500/50 transition-all cursor-pointer ${
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.aac"
          className="hidden"
          onChange={handleUpload}
          disabled={isLoading}
        />
        <Upload className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-400">Carica audio (MP3, WAV, M4A)</span>
      </label>
    </div>
  )
}
