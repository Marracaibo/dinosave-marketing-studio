'use client'

import { useState } from 'react'
import { Type, Shuffle, AlignCenter } from 'lucide-react'
import type { EditSettings } from '@/app/page'

interface TextOverlayProps {
  settings: EditSettings
  updateSettings: (updates: Partial<EditSettings>) => void
}

const RAGE_BAIT_HOOKS = [
  "Wait for it... 😱",
  "This is insane 🤯",
  "Nobody expected this...",
  "POV: When it hits different",
  "Why did this work?! 😳",
  "Can't believe I recorded this",
  "This took 47 tries",
  "Watch till the end 👀",
  "My friends thought I was crazy",
  "This shouldn't be possible",
  "I was NOT ready for this",
  "How is this even real?!",
  "My brain can't process this",
  "This changed everything",
  "You won't believe what happens",
]

const TEXT_POSITIONS = [
  { value: 'top-left', label: 'Alto SX' },
  { value: 'top-center', label: 'Alto' },
  { value: 'top-right', label: 'Alto DX' },
  { value: 'center', label: 'Centro' },
  { value: 'bottom-center', label: 'Basso' },
] as const

export default function TextOverlay({ settings, updateSettings }: TextOverlayProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)

  const pickRandomHook = () => {
    const randomIndex = Math.floor(Math.random() * RAGE_BAIT_HOOKS.length)
    updateSettings({ textOverlay: RAGE_BAIT_HOOKS[randomIndex] })
  }

  return (
    <div className="space-y-4">
      {/* Text Input */}
      <div className="relative">
        <input
          type="text"
          value={settings.textOverlay}
          onChange={(e) => updateSettings({ textOverlay: e.target.value })}
          placeholder="Scrivi il tuo hook..."
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 pr-12"
        />
        <button
          onClick={pickRandomHook}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-400 transition-colors"
          title="Hook casuale"
        >
          <Shuffle className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Suggestions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
        >
          <Type className="w-4 h-4" />
          {showSuggestions ? 'Nascondi suggerimenti' : 'Mostra suggerimenti rage-bait'}
        </button>
        
        {showSuggestions && (
          <div className="flex flex-wrap gap-2">
            {RAGE_BAIT_HOOKS.slice(0, 6).map((hook, i) => (
              <button
                key={i}
                onClick={() => updateSettings({ textOverlay: hook })}
                className="text-xs bg-white/10 hover:bg-primary-500/30 px-3 py-1.5 rounded-full transition-all"
              >
                {hook}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Position & Font Size */}
      {settings.textOverlay && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          {/* Position */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <AlignCenter className="w-4 h-4" />
              Posizione testo
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => updateSettings({ textPosition: pos.value })}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    settings.textPosition === pos.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Dimensione font</span>
              <span className="text-primary-400">{settings.textFontSize}px</span>
            </label>
            <input
              type="range"
              min="24"
              max="72"
              step="4"
              value={settings.textFontSize}
              onChange={(e) => updateSettings({ textFontSize: parseInt(e.target.value) })}
              className="w-full accent-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
