'use client'

import { useState, useRef, useEffect } from 'react'
import { Scissors, Sun, Contrast, Palette, Zap, RotateCcw } from 'lucide-react'
import type { EditSettings } from '@/app/page'

interface VideoEditorProps {
  settings: EditSettings
  updateSettings: (updates: Partial<EditSettings>) => void
  videoDuration: number | null
}

export default function VideoEditor({ settings, updateSettings, videoDuration }: VideoEditorProps) {
  const duration = videoDuration || 60

  const resetFilters = () => {
    updateSettings({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      playbackSpeed: 1,
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-5">
      {/* Trim Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Scissors className="w-4 h-4" />
          <span>Taglia Video</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Inizio: {formatTime(settings.trimStart)}</span>
            <span>Fine: {settings.trimEnd > 0 ? formatTime(settings.trimEnd) : formatTime(duration)}</span>
          </div>
          
          {/* Trim Start */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12">Inizio</span>
            <input
              type="range"
              min="0"
              max={Math.max(0, (settings.trimEnd || duration) - 1)}
              step="0.1"
              value={settings.trimStart}
              onChange={(e) => updateSettings({ trimStart: parseFloat(e.target.value) })}
              className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>
          
          {/* Trim End */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12">Fine</span>
            <input
              type="range"
              min={settings.trimStart + 1}
              max={duration}
              step="0.1"
              value={settings.trimEnd || duration}
              onChange={(e) => updateSettings({ trimEnd: parseFloat(e.target.value) })}
              className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Speed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Zap className="w-4 h-4" />
            <span>Velocità</span>
          </div>
          <span className="text-sm text-primary-400">{settings.playbackSpeed}x</span>
        </div>
        <div className="flex gap-2">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => updateSettings({ playbackSpeed: speed })}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                settings.playbackSpeed === speed
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Brightness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Sun className="w-4 h-4" />
            <span>Luminosità</span>
          </div>
          <span className="text-sm text-gray-500">{settings.brightness > 0 ? '+' : ''}{settings.brightness}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          value={settings.brightness}
          onChange={(e) => updateSettings({ brightness: parseInt(e.target.value) })}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
        />
      </div>

      {/* Contrast */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Contrast className="w-4 h-4" />
            <span>Contrasto</span>
          </div>
          <span className="text-sm text-gray-500">{settings.contrast > 0 ? '+' : ''}{settings.contrast}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          value={settings.contrast}
          onChange={(e) => updateSettings({ contrast: parseInt(e.target.value) })}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Saturation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Palette className="w-4 h-4" />
            <span>Saturazione</span>
          </div>
          <span className="text-sm text-gray-500">{settings.saturation > 0 ? '+' : ''}{settings.saturation}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          value={settings.saturation}
          onChange={(e) => updateSettings({ saturation: parseInt(e.target.value) })}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
        />
      </div>

      {/* Reset Button */}
      <button
        onClick={resetFilters}
        className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg flex items-center justify-center gap-2 transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        Reset Filtri
      </button>
    </div>
  )
}
