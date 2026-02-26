'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Listen for auth state changes - Supabase will process the URL tokens
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // User clicked the reset link and Supabase processed it
          setHasSession(true)
          setChecking(false)
        } else if (event === 'SIGNED_IN' && session) {
          // Session established
          setHasSession(true)
          setChecking(false)
        }
      }
    )

    // Also check for existing session
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasSession(true)
      }
      // Give Supabase a moment to process URL tokens
      setTimeout(() => {
        setChecking(false)
      }, 1000)
    }
    checkSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
        return
      }

      // Sign out and redirect to login
      await supabase.auth.signOut()
      router.push('/login?message=Password updated successfully')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-text-primary">
            Rivyls
          </Link>
          <p className="text-text-secondary mt-2">Set a new password</p>
        </div>

        <div className="bg-surface rounded-lg p-8 shadow-lg">
          {!hasSession && !checking ? (
            <div>
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
                Invalid or expired reset link. Please request a new one.
              </div>
              <Link
                href="/forgot-password"
                className="block w-full text-center bg-brand hover:bg-brand-hover text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="password" className="block text-text-secondary mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-text-secondary mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand"
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
