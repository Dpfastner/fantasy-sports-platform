'use client'

import { useState } from 'react'
import { ShareButton } from '@/components/ShareButton'
import { buildShareUrl } from '@/lib/share'

interface InviteCodeCardProps {
  inviteCode: string
  leagueName: string
  leagueId: string
}

export function InviteCodeCard({ inviteCode, leagueName, leagueId }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-highlight-row border border-brand rounded-lg p-3 mb-6 flex items-center gap-3">
      <span className="text-brand-text text-sm">Invite Code:</span>
      <button
        onClick={handleCopyCode}
        className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
        title="Click to copy invite code"
      >
        <code className="text-lg font-mono text-text-primary tracking-wider">
          {inviteCode}
        </code>
        {copied ? (
          <span className="text-xs text-success-text">Copied!</span>
        ) : (
          <svg className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
          </svg>
        )}
      </button>
      <span className="text-text-muted text-xs hidden sm:inline">Reusable — anyone can join with this code until the league is full.</span>
      <div className="ml-auto">
        <ShareButton
          shareData={{
            title: `Join ${leagueName} on Rivyls!`,
            text: `Join my fantasy college football league "${leagueName}" on Rivyls! Use invite code: ${inviteCode}`,
            url: buildShareUrl(`/leagues/join?code=${inviteCode}`, { source: 'invite', campaign: leagueName }),
          }}
          ogImageUrl={`/api/og/invite?leagueId=${leagueId}`}
          label="Share Invite"
        />
      </div>
    </div>
  )
}
