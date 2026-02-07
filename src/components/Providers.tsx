'use client'

import { ReactNode } from 'react'
import { ToastProvider } from './Toast'
import ReportIssue from './ReportIssue'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      {children}
      <ReportIssue />
    </ToastProvider>
  )
}
