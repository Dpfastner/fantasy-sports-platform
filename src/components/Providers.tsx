'use client'

import { ReactNode, useEffect } from 'react'
import { ToastProvider } from './Toast'
import { PaletteProvider } from './PaletteProvider'
import PaletteSwitcher from './PaletteSwitcher'
import ReportIssue from './ReportIssue'
import TosGate from './TosGate'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Register service worker for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[sw] Registration failed:', err)
      })
    }
  }, [])

  return (
    <PaletteProvider>
      <ToastProvider>
        {children}
        <PaletteSwitcher />
        <ReportIssue />
        <TosGate />
      </ToastProvider>
    </PaletteProvider>
  )
}
