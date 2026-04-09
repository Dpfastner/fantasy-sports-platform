'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { track } from '@vercel/analytics'

function SignUpForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!ageConfirmed) {
      setError('You must confirm you are at least 18 years old')
      return
    }

    if (!tosAccepted) {
      setError('You must agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)

    try {
      const redirectTo = next
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`

      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
          emailRedirectTo: redirectTo,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      // Detect existing account — Supabase returns identities: [] for duplicate emails
      if (data.user?.identities?.length === 0) {
        setError('This email already has an account. Please sign in instead.')
        return
      }

      // Log ToS acceptance (uses admin client, no session needed)
      if (data.user?.id) {
        fetch('/api/tos/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            tosVersion: '2026-04-01',
          }),
        }).catch(() => {
          // Non-blocking — signup still succeeds even if ToS logging fails
          console.error('Failed to log ToS acceptance')
        })
      }

      // Show success message - user needs to confirm email
      track('signup_completed')
      setSuccess(true)
    } catch {
      setError('Something went wrong creating your account. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-text-primary">
            Rivyls
          </Link>
          <p className="text-text-secondary mt-2">Create your account</p>
        </div>

        {success ? (
          <div className="bg-surface rounded-lg p-8 shadow-lg text-center">
            <div className="text-success-text text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Check your email</h2>
            <p className="text-text-secondary mb-6">
              We sent a confirmation link to <span className="text-text-primary">{email}</span>.
              Click the link and you&apos;ll be signed in automatically.
            </p>
            <p className="text-text-muted text-sm mb-4">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                onClick={async () => {
                  const resendRedirect = next
                    ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
                    : `${window.location.origin}/auth/callback`
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email,
                    options: { emailRedirectTo: resendRedirect },
                  })
                  if (!error) {
                    addToast('Confirmation email resent! Check your inbox.', 'success')
                  }
                }}
                className="text-brand-text hover:underline"
              >
                resend the confirmation email
              </button>.
            </p>
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
              className="text-brand-text hover:text-brand-text"
            >
              Already confirmed? Sign in
            </Link>
          </div>
        ) : (
        <form onSubmit={handleSignUp} className="bg-surface rounded-lg p-8 shadow-lg">
          {error && (
            <div className="bg-surface border border-danger text-danger px-4 py-3 rounded-lg mb-6">
              {error}
              {error.includes('already has an account') && (
                <Link href="/login" className="block mt-2 text-brand hover:underline text-sm font-medium">
                  Go to Sign In &rarr;
                </Link>
              )}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="displayName" className="block text-text-secondary mb-2">
              Display Name <span className="text-text-muted text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand"
              placeholder="Your name"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-text-secondary mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-text-secondary mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand pr-12"
                placeholder="At least 6 characters"
              />
              {/* #2: Password strength indicator */}
              {password && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          password.length >= 6 && level <= (
                            password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4
                            : password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3
                            : password.length >= 8 && (/[A-Z]/.test(password) || /[0-9]/.test(password)) ? 2
                            : 1
                          ) ? ['bg-danger', 'bg-warning', 'bg-info', 'bg-success'][level - 1] : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {password.length < 6 ? 'Too short'
                      : password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 'Strong'
                      : password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Good'
                      : password.length >= 8 ? 'Fair'
                      : 'Weak'}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-2"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-text-secondary mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-surface border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand pr-12 ${
                  confirmPassword && password
                    ? password === confirmPassword ? 'border-success' : 'border-danger'
                    : 'border-border'
                }`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-2"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {confirmPassword && password && (
              <p className={`text-xs mt-1 ${password === confirmPassword ? 'text-success-text' : 'text-danger-text'}`}>
                {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          {/* Age Gate */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-brand shrink-0"
            />
            <span className="text-text-secondary text-sm">
              I confirm that I am at least 18 years of age.
              <span className="text-text-muted text-xs block mt-0.5">You must be 18 or older to play.</span>
            </span>
          </label>

          {/* ToS + Privacy Consent */}
          <label className="flex items-start gap-3 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 accent-brand shrink-0"
            />
            <span className="text-text-secondary text-sm">
              I agree to the{' '}
              <Link href="/terms" className="text-brand-text hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-brand-text hover:underline">
                Privacy Policy
              </Link>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !ageConfirmed || !tosAccepted}
            className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-text-secondary text-center mt-6">
            Already have an account?{' '}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="text-brand-text hover:text-brand-text">
              Sign in
            </Link>
          </p>
        </form>
        )}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
