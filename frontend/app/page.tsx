'use client'

import { useState } from 'react'
import { Download, Wand2, Music, Film, Sparkles, Upload, Sliders } from 'lucide-react'
import VideoInput from '@/components/VideoInput'
import VideoPreview from '@/components/VideoPreview'
import VideoEditor from '@/components/VideoEditor'
import OverlaySelector from '@/components/OverlaySelector'
import AudioSelector from '@/components/AudioSelector'
import TextOverlay from '@/components/TextOverlay'
import ProcessButton from '@/components/ProcessButton'

export interface VideoState {
  videoId: string | null
  filename: string | null
  previewUrl: string | null
  title: string | null
  duration: number | null
}

export interface EditSettings {
  overlayId: string | null
  overlayPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  overlayX: number  // Percentuale 0-100
  overlayY: number  // Percentuale 0-100
  overlayScale: number
  removeGreenScreen: boolean
  audioId: string | null
  removeOriginalAudio: boolean
  textOverlay: string
  textPosition: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-center'
  textFontSize: number
  // Video editing
  trimStart: number
  trimEnd: number
  brightness: number
  contrast: number
  saturation: number
  playbackSpeed: number
}

export default function Home() {
  const [video, setVideo] = useState<VideoState>({
    videoId: null,
    filename: null,
    previewUrl: null,
    title: null,
    duration: null,
  })

  const [settings, setSettings] = useState<EditSettings>({
    overlayId: null,
    overlayPosition: 'bottom-right',
    overlayX: 70,  // Default bottom-right
    overlayY: 70,
    overlayScale: 0.25,
    removeGreenScreen: true,
    audioId: null,
    removeOriginalAudio: false,
    textOverlay: '',
    textPosition: 'top-center',
    textFontSize: 48,
    // Video editing defaults
    trimStart: 0,
    trimEnd: 0, // 0 = use full video
    brightness: 0,
    contrast: 0,
    saturation: 0,
    playbackSpeed: 1,
  })

  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const updateSettings = (updates: Partial<EditSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header - Mobile Optimized */}
      <header className="text-center mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3 md:mb-4">
          <img src="/logo.png" alt="DinoSave" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold">
            <span className="gradient-text">DinoSave</span>
            <span className="text-white block sm:inline"> Marketing Studio</span>
          </h1>
        </div>
        <p className="text-gray-400 text-sm sm:text-lg px-4">
          Scarica, edita e remixa video da TikTok e Instagram 🦖💰
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input & Preview */}
        <div className="space-y-6">
          {/* Video Input */}
          <section className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg sm:text-xl font-semibold">Carica Video</h2>
            </div>
            <VideoInput 
              video={video} 
              setVideo={setVideo} 
              setOutputUrl={setOutputUrl}
            />
          </section>

          {/* Video Preview */}
          {(video.previewUrl || video.videoId) && (
            <section className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Film className="w-5 h-5 text-accent-400" />
                <h2 className="text-lg sm:text-xl font-semibold">Anteprima</h2>
              </div>
              <VideoPreview video={video} outputUrl={outputUrl} settings={settings} updateSettings={updateSettings} />
            </section>
          )}
        </div>

        {/* Right Column - Edit Options */}
        <div className="space-y-6">
          {/* Overlay Selector */}
          <section className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg sm:text-xl font-semibold">Overlay Dino 🦖</h2>
            </div>
            <OverlaySelector 
              settings={settings} 
              updateSettings={updateSettings} 
            />
          </section>

          {/* Video Editor */}
          {video.videoId && (
            <section className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg sm:text-xl font-semibold">Modifica Video ✂️</h2>
              </div>
              <VideoEditor 
                settings={settings} 
                updateSettings={updateSettings}
                videoDuration={video.duration}
              />
            </section>
          )}

          {/* Audio Selector */}
          <section className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-green-400" />
              <h2 className="text-lg sm:text-xl font-semibold">Audio</h2>
            </div>
            <AudioSelector 
              settings={settings} 
              updateSettings={updateSettings} 
            />
          </section>

          {/* Text Overlay */}
          <section className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg sm:text-xl font-semibold">Testo / Hook</h2>
            </div>
            <TextOverlay 
              settings={settings} 
              updateSettings={updateSettings} 
            />
          </section>

          {/* Process Button */}
          <ProcessButton
            video={video}
            settings={settings}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            setOutputUrl={setOutputUrl}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>DinoSave Marketing Studio v1.0 • Creato per il content grind 🦖💰</p>
      </footer>
    </main>
  )
}
