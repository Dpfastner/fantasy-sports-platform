'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { palettes, DEFAULT_PALETTE_ID, type PaletteDefinition } from '@/lib/palettes'

interface PaletteContextType {
  currentPalette: PaletteDefinition
  setPalette: (id: string) => void
  allPalettes: PaletteDefinition[]
  isPreviewMode: boolean
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined)

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider')
  return ctx
}

const STORAGE_KEY = 'rivyls-palette'

export function PaletteProvider({ children }: { children: ReactNode }) {
  const isPreviewMode = process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production'
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE_ID)

  // Read from localStorage on mount (sandbox/dev only)
  useEffect(() => {
    if (isPreviewMode) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && palettes.find(p => p.id === stored)) {
        setPaletteId(stored)
      }
    }
  }, [isPreviewMode])

  // Apply data-palette attribute to <html>
  useEffect(() => {
    const html = document.documentElement
    if (paletteId === DEFAULT_PALETTE_ID) {
      html.removeAttribute('data-palette')
    } else {
      html.setAttribute('data-palette', paletteId)
    }
    const palette = palettes.find(p => p.id === paletteId)
    html.setAttribute('data-palette-mode', palette?.mode || 'dark')
  }, [paletteId])

  const setPalette = (id: string) => {
    setPaletteId(id)
    if (isPreviewMode) {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }

  const currentPalette = palettes.find(p => p.id === paletteId) || palettes[0]

  return (
    <PaletteContext.Provider value={{ currentPalette, setPalette, allPalettes: palettes, isPreviewMode }}>
      {children}
    </PaletteContext.Provider>
  )
}
