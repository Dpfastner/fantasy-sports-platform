'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('missing')
      return
    }

    async function processUnsubscribe() {
      try {
        const response = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          setStatus('success')
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }

    processUnsubscribe()
  }, [token])

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface rounded-lg p-8 shadow-lg text-center">
        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-bold text-text-primary mb-4">Processing...</h1>
            <p className="text-text-secondary">Updating your email preferences.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-success-text text-5xl mb-4">&#10003;</div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">Unsubscribed</h1>
            <p className="text-text-secondary mb-6">
              You&apos;ve been unsubscribed from promotional emails. You&apos;ll still receive
              essential account notifications.
            </p>
            <p className="text-text-muted text-sm">
              You can manage your preferences in{' '}
              <Link href="/settings" className="text-brand-text hover:underline">Account Settings</Link>.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-text-primary mb-4">Something went wrong</h1>
            <p className="text-text-secondary mb-6">
              We couldn&apos;t process your unsubscribe request. Please try again or manage
              your preferences in{' '}
              <Link href="/settings" className="text-brand-text hover:underline">Account Settings</Link>.
            </p>
          </>
        )}

        {status === 'missing' && (
          <>
            <h1 className="text-2xl font-bold text-text-primary mb-4">Invalid Link</h1>
            <p className="text-text-secondary mb-6">
              This unsubscribe link is missing or invalid. You can manage your email
              preferences in{' '}
              <Link href="/settings" className="text-brand-text hover:underline">Account Settings</Link>.
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-block mt-4 text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          &larr; Back to Rivyls
        </Link>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
