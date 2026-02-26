'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface EmailCaptureFormProps {
  source?: string
  inverted?: boolean
}

export default function EmailCaptureForm({ source = 'landing_page', inverted = false }: EmailCaptureFormProps) {
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

  // Color helpers for inverted (gold bg) vs default (dark bg)
  const textMain = inverted ? 'text-text-inverse' : 'text-text-primary'
  const textSub = inverted ? 'text-text-inverse/75' : 'text-text-secondary'
  const inputClass = inverted
    ? 'w-full bg-white border border-white/20 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent'
    : 'w-full bg-surface-inset border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
  const btnClass = inverted
    ? 'w-full bg-page hover:bg-surface text-text-primary font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50'
    : 'w-full bg-brand hover:bg-brand-hover text-text-inverse font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50'

  // Success state
  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-2 ${inverted ? 'bg-white/20' : 'bg-success-subtle'}`}>
          <svg className={`w-8 h-8 ${inverted ? 'text-text-inverse' : 'text-success-text'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className={`brand-h3 text-2xl ${textMain}`}>You&apos;re In!</h3>
        <p className={textSub}>
          We&apos;ll let you know as soon as Rivyls is ready for you.
        </p>
        {referralUrl && (
          <div className={`mt-6 p-4 rounded-xl border ${inverted ? 'bg-white/10 border-white/20' : 'bg-surface border-border'}`}>
            <p className={`text-sm font-medium mb-2 ${textMain}`}>Share your referral link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className={inverted
                  ? 'flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-text-inverse'
                  : 'flex-1 bg-surface-inset border border-border rounded-lg px-3 py-2 text-sm text-text-secondary'
                }
              />
              <button
                onClick={() => navigator.clipboard.writeText(referralUrl)}
                className={inverted
                  ? 'px-4 py-2 bg-page hover:bg-surface text-text-primary rounded-lg text-sm font-semibold transition-colors'
                  : 'px-4 py-2 bg-brand hover:bg-brand-hover text-text-inverse rounded-lg text-sm font-semibold transition-colors'
                }
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
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-2 ${inverted ? 'bg-white/20' : 'bg-brand-subtle'}`}>
          <svg className={`w-8 h-8 ${inverted ? 'text-text-inverse' : 'text-brand-text'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h3 className={`brand-h3 text-2xl ${textMain}`}>{duplicateMessage}</h3>
        <button
          onClick={() => { setDuplicateMessage(''); setEmail(''); }}
          className={`text-sm hover:underline ${inverted ? 'text-text-inverse/75' : 'text-brand-text'}`}
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
        <label htmlFor={`name-${source}`} className={`block text-sm font-medium mb-1 ${textSub}`}>
          Name <span className={inverted ? 'text-text-inverse/50' : 'text-text-muted'}>(optional)</span>
        </label>
        <input
          id={`name-${source}`}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`email-${source}`} className={`block text-sm font-medium mb-1 ${textSub}`}>
          Email
        </label>
        <input
          id={`email-${source}`}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className={inputClass}
        />
      </div>
      {error && (
        <p className={`text-sm ${inverted ? 'text-red-900' : 'text-danger-text'}`}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className={btnClass}
      >
        {loading ? 'Joining...' : 'Join the Waitlist'}
      </button>
    </form>
  )
}
