'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/Header'
import { trackActivity } from '@/app/actions/activity'

interface Profile {
  display_name: string | null
  email: string
  timezone: string
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  // Form states
  const [displayName, setDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [timezone, setTimezone] = useState('America/New_York')

  // Notification preferences
  const [emailGameResults, setEmailGameResults] = useState(true)
  const [emailDraftReminders, setEmailDraftReminders] = useState(true)
  const [emailTransactionConfirmations, setEmailTransactionConfirmations] = useState(true)
  const [emailLeagueAnnouncements, setEmailLeagueAnnouncements] = useState(true)
  const [savingNotifications, setSavingNotifications] = useState(false)

  // Messages
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email || '')
      setNewEmail(user.email || '')

      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, email, timezone')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setDisplayName(profileData.display_name || '')
        setTimezone(profileData.timezone || 'America/New_York')
      }

      // Load notification preferences
      const { data: notifData } = await supabase
        .from('notification_preferences')
        .select('email_game_results, email_draft_reminders, email_transaction_confirmations, email_league_announcements')
        .eq('user_id', user.id)
        .maybeSingle()

      if (notifData) {
        setEmailGameResults(notifData.email_game_results)
        setEmailDraftReminders(notifData.email_draft_reminders)
        setEmailTransactionConfirmations(notifData.email_transaction_confirmations)
        setEmailLeagueAnnouncements(notifData.email_league_announcements)
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccessMessage(message)
      setErrorMessage('')
    } else {
      setErrorMessage(message)
      setSuccessMessage('')
    }
    setTimeout(() => {
      setSuccessMessage('')
      setErrorMessage('')
    }, 5000)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          timezone: timezone,
        })
        .eq('id', user.id)

      if (error) throw error

      trackActivity('profile.updated', null, { displayName, timezone })
      showMessage('success', 'Profile updated successfully!')
    } catch (error) {
      showMessage('error', `Failed to update profile: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (newEmail === userEmail) {
        showMessage('error', 'New email is the same as current email')
        setSaving(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail })

      if (error) throw error

      trackActivity('profile.email_changed')
      showMessage('success', 'Confirmation email sent to your new address. Please check your inbox.')
    } catch (error) {
      showMessage('error', `Failed to update email: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (newPassword !== confirmPassword) {
        showMessage('error', 'Passwords do not match')
        setSaving(false)
        return
      }

      if (newPassword.length < 6) {
        showMessage('error', 'Password must be at least 6 characters')
        setSaving(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showMessage('success', 'Password updated successfully!')
    } catch (error) {
      showMessage('error', `Failed to update password: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateNotifications = async () => {
    setSavingNotifications(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const prefs = {
        user_id: user.id,
        email_game_results: emailGameResults,
        email_draft_reminders: emailDraftReminders,
        email_transaction_confirmations: emailTransactionConfirmations,
        email_league_announcements: emailLeagueAnnouncements,
      }

      // Upsert: create if not exists, update if exists
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(prefs, { onConflict: 'user_id' })

      if (error) throw error

      showMessage('success', 'Notification preferences saved!')
    } catch (error) {
      showMessage('error', `Failed to save notifications: ${error}`)
    } finally {
      setSavingNotifications(false)
    }
  }

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={profile?.display_name} userEmail={userEmail} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary transition-colors">
            &larr; Back
          </button>
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-8">Account Settings</h1>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-success/10 border border-success text-success-text px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-danger/10 border border-danger text-danger-text px-4 py-3 rounded-lg mb-6">
            {errorMessage}
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-sm mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace('_', ' ').replace('America/', '').replace('Pacific/', '')}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Email Settings */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Email Address</h2>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-1">Current Email</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full px-4 py-2 bg-surface-subtle border border-border rounded-lg text-text-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-sm mb-1">New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                placeholder="new@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={saving || newEmail === userEmail}
              className="bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {saving ? 'Sending...' : 'Update Email'}
            </button>
            <p className="text-text-muted text-sm">
              A confirmation email will be sent to your new address.
            </p>
          </form>
        </div>

        {/* Password Settings */}
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Change Password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand pr-12"
                  placeholder="New password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
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
            <div>
              <label className="block text-text-secondary text-sm mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand pr-12"
                  placeholder="Confirm new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
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
            </div>
            <button
              type="submit"
              disabled={saving || !newPassword || !confirmPassword}
              className="bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-surface rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Notifications</h2>
          <p className="text-text-muted text-sm mb-4">
            Choose which email notifications you&apos;d like to receive.
          </p>
          <div className="space-y-3">
            <NotificationToggle
              label="Game Results"
              description="Weekly score updates when games are completed"
              checked={emailGameResults}
              onChange={setEmailGameResults}
            />
            <NotificationToggle
              label="Draft Reminders"
              description="Reminders when your draft is about to start"
              checked={emailDraftReminders}
              onChange={setEmailDraftReminders}
            />
            <NotificationToggle
              label="Transaction Confirmations"
              description="Confirmation when add/drop transactions are processed"
              checked={emailTransactionConfirmations}
              onChange={setEmailTransactionConfirmations}
            />
            <NotificationToggle
              label="League Announcements"
              description="Updates from your league commissioners"
              checked={emailLeagueAnnouncements}
              onChange={setEmailLeagueAnnouncements}
            />
          </div>
          <button
            type="button"
            onClick={handleUpdateNotifications}
            disabled={savingNotifications}
            className="mt-4 bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {savingNotifications ? 'Saving...' : 'Save Notifications'}
          </button>
        </div>
      </main>
    </div>
  )
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <div>
        <p className="text-text-primary text-sm font-medium">{label}</p>
        <p className="text-text-muted text-xs">{description}</p>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-surface-inset'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </div>
    </label>
  )
}
