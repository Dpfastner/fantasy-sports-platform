'use client'

import { ReactNode, useEffect } from 'react'
import { ToastProvider } from './Toast'
import { ConfirmProvider } from './ConfirmDialog'
import { PaletteProvider } from './PaletteProvider'
import PaletteSwitcher from './PaletteSwitcher'
import ReportIssue from './ReportIssue'
import TosGate from './TosGate'
import { ChatContextProvider } from '@/contexts/ChatContext'
import { MobileChatPeek } from './chat/MobileChatPeek'
import { createClient } from '@/lib/supabase/client'

const PUSH_PROMPTED_KEY = 'rivyls_push_prompted'

interface ProvidersProps {
  children: ReactNode
}

async function autoSubscribePush(registration: ServiceWorkerRegistration) {
  // Already prompted this browser — don't ask again
  if (localStorage.getItem(PUSH_PROMPTED_KEY)) return

  // Only prompt logged-in users
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Mark as prompted before requesting (so we never spam the dialog)
  localStorage.setItem(PUSH_PROMPTED_KEY, '1')

  // If permission already denied, nothing we can do
  if (Notification.permission === 'denied') return

  // Request permission (shows browser dialog if 'default')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  // Subscribe via Push API
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) return

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    })

    const json = subscription.toJSON()
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      }),
    })
  } catch (err) {
    console.error('[push] Auto-subscribe failed:', err)
  }
}

export function Providers({ children }: ProvidersProps) {
  // Register service worker and auto-prompt for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Auto-prompt for push on first visit (logged-in users only)
          if ('Notification' in window && 'PushManager' in window) {
            autoSubscribePush(registration)
          }
        })
        .catch((err) => {
          console.error('[sw] Registration failed:', err)
        })
    }
  }, [])

  return (
    <PaletteProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ChatContextProvider>
            {children}
            <MobileChatPeek />
          </ChatContextProvider>
          <PaletteSwitcher />
          <ReportIssue />
          <TosGate />
        </ConfirmProvider>
      </ToastProvider>
    </PaletteProvider>
  )
}
