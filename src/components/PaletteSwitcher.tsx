'use client'

import { useState } from 'react'
import { usePalette } from './PaletteProvider'

/**
 * Floating palette switcher for sandbox/dev environments.
 * Lets test users compare color palettes and provide feedback.
 */
export default function PaletteSwitcher() {
  const { currentPalette, setPalette, allPalettes, isPreviewMode } = usePalette()
  const [isOpen, setIsOpen] = useState(false)

  if (!isPreviewMode) return null

  return (
    <div className="fixed bottom-14 left-4 z-50">
      {/* Expanded panel */}
      {isOpen && (
        <div
          className="mb-2 rounded-xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--palette-surface)',
            border: '1px solid var(--palette-border)',
            width: '320px',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{
              borderBottom: '1px solid var(--palette-border)',
            }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--palette-text-primary)' }}
            >
              Color Palettes
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs px-2 py-1 rounded hover:opacity-80"
              style={{ color: 'var(--palette-text-muted)' }}
            >
              Close
            </button>
          </div>

          {/* Palette list */}
          <div className="p-2 space-y-1">
            {allPalettes.map((palette) => {
              const isActive = palette.id === currentPalette.id
              return (
                <button
                  key={palette.id}
                  onClick={() => setPalette(palette.id)}
                  className="w-full text-left rounded-lg p-3 transition-all"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--palette-brand-subtle)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid var(--palette-brand)'
                      : '1px solid transparent',
                  }}
                >
                  {/* Top row: name + badges */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--palette-text-primary)' }}
                    >
                      {palette.name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.08)',
                        color: 'var(--palette-text-muted)',
                      }}
                    >
                      {palette.mode === 'dark' ? 'DARK' : 'LIGHT'}
                    </span>
                    {palette.recommended && (
                      <span className="text-[10px]" title="Recommended">
                        ★
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="text-[10px] font-bold ml-auto"
                        style={{ color: 'var(--palette-brand)' }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Color swatches */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {[
                      palette.colors.primary,
                      palette.colors.secondary,
                      palette.colors.tertiary,
                      palette.colors.neutral,
                      palette.colors.base,
                    ].map((color, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-md border"
                        style={{
                          backgroundColor: color,
                          borderColor: 'rgba(128,128,128,0.3)',
                        }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Description */}
                  <p
                    className="text-[11px] leading-tight"
                    style={{ color: 'var(--palette-text-muted)' }}
                  >
                    {palette.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-bold transition-all hover:scale-105"
        style={{
          backgroundColor: 'var(--palette-surface)',
          color: 'var(--palette-text-primary)',
          border: '1px solid var(--palette-border)',
        }}
      >
        {/* Mini swatches */}
        <div className="flex -space-x-1">
          {[
            currentPalette.colors.primary,
            currentPalette.colors.secondary,
            currentPalette.colors.tertiary,
          ].map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border"
              style={{
                backgroundColor: color,
                borderColor: 'rgba(128,128,128,0.3)',
              }}
            />
          ))}
        </div>
        {currentPalette.name}
        <span style={{ color: 'var(--palette-text-muted)' }}>
          {isOpen ? '▼' : '▲'}
        </span>
      </button>
    </div>
  )
}
