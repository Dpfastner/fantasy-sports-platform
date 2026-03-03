'use client'

import { ReactNode } from 'react'
import { ToastProvider } from './Toast'
import { PaletteProvider } from './PaletteProvider'
import PaletteSwitcher from './PaletteSwitcher'
import ReportIssue from './ReportIssue'
import TosGate from './TosGate'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
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
