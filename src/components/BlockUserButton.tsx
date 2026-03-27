'use client'

import { useState } from 'react'

interface BlockUserButtonProps {
  targetUserId: string
  initiallyBlocked: boolean
}

export function BlockUserButton({ targetUserId, initiallyBlocked }: BlockUserButtonProps) {
  const [blocked, setBlocked] = useState(initiallyBlocked)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${targetUserId}/block`, {
        method: blocked ? 'DELETE' : 'POST',
      })
      if (res.ok) {
        setBlocked(!blocked)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${
        blocked
          ? 'bg-surface-subtle hover:bg-surface-inset text-text-muted border border-border'
          : 'bg-danger/20 hover:bg-danger/30 text-danger-text border border-danger/30'
      }`}
    >
      {loading ? '...' : blocked ? 'Unblock User' : 'Block User'}
    </button>
  )
}
