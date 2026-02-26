'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface EmailCaptureFormProps {
  source?: string
}

export default function EmailCaptureForm({ source = 'landing_page' }: EmailCaptureFormProps) {
  const searchParams = useSearchParams()
  const referredBy = searchParams.get('ref') || undefined

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [duplicateMessage, setDuplicateMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setDuplicateMessage('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          source,
          referral_code: referredBy,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        setDuplicateMessage(data.message)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.message || 'Something went wrong.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setReferralCode(data.referral_code)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const referralUrl = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/welcome?ref=${referralCode}`
    : ''

  // Success state
  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-subtle mb-2">
          <svg className="w-8 h-8 text-success-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="brand-h3 text-2xl text-text-primary">You&apos;re In!</h3>
        <p className="text-text-secondary">
          We&apos;ll let you know as soon as Rivyls is ready for you.
        </p>
        {referralUrl && (
          <div className="mt-6 p-4 bg-surface rounded-xl border border-border">
            <p className="text-sm font-medium text-text-primary mb-2">Share your referral link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 bg-surface-inset border border-border rounded-lg px-3 py-2 text-sm text-text-secondary"
              />
              <button
                onClick={() => navigator.clipboard.writeText(referralUrl)}
                className="px-4 py-2 bg-brand hover:bg-brand-hover text-text-inverse rounded-lg text-sm font-semibold transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Duplicate state
  if (duplicateMessage) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-subtle mb-2">
          <svg className="w-8 h-8 text-brand-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h3 className="brand-h3 text-2xl text-text-primary">{duplicateMessage}</h3>
        <button
          onClick={() => { setDuplicateMessage(''); setEmail(''); }}
          className="text-sm text-brand-text hover:underline"
        >
          Try a different email
        </button>
      </div>
    )
  }

  // Form state
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <label htmlFor={`name-${source}`} className="block text-sm font-medium text-text-secondary mb-1">
          Name <span className="text-text-muted">(optional)</span>
        </label>
        <input
          id={`name-${source}`}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full bg-surface-inset border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>
      <div>
        <label htmlFor={`email-${source}`} className="block text-sm font-medium text-text-secondary mb-1">
          Email
        </label>
        <input
          id={`email-${source}`}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full bg-surface-inset border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>
      {error && (
        <p className="text-sm text-danger-text">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-hover text-text-inverse font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Joining...' : 'Join the Waitlist'}
      </button>
    </form>
  )
}
