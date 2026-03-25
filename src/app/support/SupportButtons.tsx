'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

const presets = [
  { amount: 5, label: '$5', subtitle: 'Buy a coffee' },
  { amount: 10, label: '$10', subtitle: 'Cover a day of hosting' },
  { amount: 20, label: '$20', subtitle: 'Fund a feature' },
]

export default function SupportButtons() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState<number | string | null>(null)

  async function handleSupport(amount: number, key: number | string) {
    setLoading(key)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      if (res.status === 401) {
        window.location.href = '/login?next=/support'
        return
      }

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Something went wrong')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  if (success) {
    return (
      <div className="mb-8 text-center">
        <div className="bg-success-subtle border border-success rounded-lg p-6">
          <h2 className="text-xl font-bold text-success-text mb-2">Thank you!</h2>
          <p className="text-text-secondary">
            Your support means everything. You just earned the Supporter badge on your profile.
          </p>
        </div>
      </div>
    )
  }

  if (canceled) {
    return (
      <div className="mb-8">
        <div className="bg-warning-subtle border border-warning rounded-lg p-4 mb-4 text-center">
          <p className="text-sm text-text-secondary">
            No worries — support is completely optional. You can always come back later.
          </p>
        </div>
        <SupportGrid
          loading={loading}
          onSupport={handleSupport}
          customAmount={customAmount}
          setCustomAmount={setCustomAmount}
        />
      </div>
    )
  }

  return (
    <div className="mb-8">
      <SupportGrid
        loading={loading}
        onSupport={handleSupport}
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
      />
    </div>
  )
}

function SupportGrid({
  loading,
  onSupport,
  customAmount,
  setCustomAmount,
}: {
  loading: number | string | null
  onSupport: (amount: number, key: number | string) => void
  customAmount: string
  setCustomAmount: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {presets.map((p) => (
        <button
          key={p.amount}
          onClick={() => onSupport(p.amount, p.amount)}
          disabled={loading !== null}
          className="flex flex-col items-center min-w-[120px] bg-brand hover:bg-brand-hover text-text-primary font-semibold rounded-lg px-6 py-4 text-center transition-colors disabled:opacity-50"
        >
          {loading === p.amount ? (
            <span className="text-lg animate-pulse">...</span>
          ) : (
            <>
              <span className="text-lg">{p.label}</span>
              <span className="text-xs font-normal opacity-80">{p.subtitle}</span>
            </>
          )}
        </button>
      ))}

      {/* Custom amount */}
      <div className="flex flex-col items-center min-w-[120px] bg-surface border border-border rounded-lg px-4 py-3 text-center">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-text-secondary font-semibold">$</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="1000"
            placeholder="Other"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-16 bg-transparent text-lg font-semibold text-text-primary text-center outline-none placeholder:text-text-muted"
          />
        </div>
        <button
          onClick={() => {
            const amt = parseFloat(customAmount)
            if (amt >= 1 && amt <= 1000) {
              onSupport(amt, 'custom')
            }
          }}
          disabled={loading !== null || !customAmount || parseFloat(customAmount) < 1}
          className="text-xs text-brand hover:text-brand-hover font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'custom' ? 'Processing...' : 'Support'}
        </button>
      </div>
    </div>
  )
}
