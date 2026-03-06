'use client'

import { useState } from 'react'
import { useToast } from './Toast'

// ── Types ──────────────────────────────────────────────────

interface RosterSchool {
  schoolId: string
  schoolName: string
  abbreviation: string | null
  logoUrl: string | null
  conference: string
  slotNumber: number
}

interface TradeItem {
  schoolId: string
  schoolName: string
  logoUrl: string | null
  direction: 'giving' | 'receiving'
  teamId: string
}

interface TradeData {
  id: string
  proposerTeamId: string
  proposerTeamName: string
  receiverTeamId: string
  receiverTeamName: string
  status: string
  message: string | null
  expiresAt: string | null
  createdAt: string
  items: TradeItem[]
}

interface PendingTradesProps {
  trades: TradeData[]
  myTeamId: string
  myTeamName: string
  leagueId: string
  myRoster: RosterSchool[]
}

// ── Component ──────────────────────────────────────────────

export default function PendingTrades({
  trades,
  myTeamId,
  myTeamName,
  leagueId,
  myRoster,
}: PendingTradesProps) {
  const { addToast } = useToast()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [counterTrade, setCounterTrade] = useState<TradeData | null>(null)
  const [dropPickerTradeId, setDropPickerTradeId] = useState<string | null>(null)
  const [dropIds, setDropIds] = useState<Set<string>>(new Set())

  const pendingTrades = trades.filter(t => t.status === 'proposed')
  const recentTrades = trades.filter(t => t.status !== 'proposed')

  if (pendingTrades.length === 0 && recentTrades.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Trade Offers</h2>
        <p className="text-text-secondary text-sm mt-2">No pending trades. Visit another team&apos;s roster to propose a trade.</p>
      </div>
    )
  }

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h remaining`
    }
    return `${hours}h remaining`
  }

  const handleAction = async (tradeId: string, action: 'accept' | 'reject' | 'cancel', drops?: string[]) => {
    setActionLoading(tradeId)
    try {
      const body: Record<string, unknown> = { tradeId, action }
      if (drops && drops.length > 0) {
        body.dropSchoolIds = drops
      }

      const res = await fetch(`/api/leagues/${leagueId}/trades/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action} trade`)

      const messages: Record<string, string> = {
        accept: 'Trade accepted! Rosters updated.',
        reject: 'Trade rejected.',
        cancel: 'Trade cancelled.',
      }
      addToast(messages[action], 'success')
      window.location.reload()
    } catch (err) {
      addToast(err instanceof Error ? err.message : `Failed to ${action} trade`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const getTradeDirection = (trade: TradeData) => {
    if (trade.receiverTeamId === myTeamId) return 'incoming'
    if (trade.proposerTeamId === myTeamId) return 'outgoing'
    return 'other'
  }

  const getMyGiving = (trade: TradeData) => {
    const dir = getTradeDirection(trade)
    if (dir === 'incoming') {
      // I'm the receiver — items with direction='giving' on MY team are what I give
      return trade.items.filter(i => i.teamId === myTeamId && i.direction === 'giving')
    }
    // I'm the proposer — items with direction='giving' on MY team
    return trade.items.filter(i => i.teamId === myTeamId && i.direction === 'giving')
  }

  const getMyReceiving = (trade: TradeData) => {
    const dir = getTradeDirection(trade)
    if (dir === 'incoming') {
      // I'm the receiver — items with direction='giving' on the OTHER team are what I receive
      return trade.items.filter(i => i.teamId !== myTeamId && i.direction === 'giving')
    }
    return trade.items.filter(i => i.teamId !== myTeamId && i.direction === 'giving')
  }

  const toggleDrop = (schoolId: string, needed: number) => {
    setDropIds(prev => {
      const next = new Set(prev)
      if (next.has(schoolId)) next.delete(schoolId)
      else if (next.size < needed) next.add(schoolId)
      return next
    })
  }

  const renderTradeCard = (trade: TradeData) => {
    const direction = getTradeDirection(trade)
    const isIncoming = direction === 'incoming'
    const isPending = trade.status === 'proposed'
    const partnerName = isIncoming ? trade.proposerTeamName : trade.receiverTeamName
    const partnerTeamId = isIncoming ? trade.proposerTeamId : trade.receiverTeamId

    const myGiving = getMyGiving(trade)
    const myReceiving = getMyReceiving(trade)

    // Check if this is an uneven trade where I receive more
    const netGain = myReceiving.length - myGiving.length
    const needsDrops = netGain > 0 && isIncoming
    const dropsNeeded = needsDrops ? netGain : 0
    const showingDropPicker = dropPickerTradeId === trade.id

    // Schools available for dropping
    const tradeSchoolIds = new Set([
      ...myGiving.map(i => i.schoolId),
      ...myReceiving.map(i => i.schoolId),
    ])
    const droppableSchools = myRoster.filter(s => !tradeSchoolIds.has(s.schoolId))

    const statusBadge = (status: string) => {
      const styles: Record<string, string> = {
        accepted: 'bg-success/20 text-success-text',
        rejected: 'bg-danger/20 text-danger-text',
        cancelled: 'bg-surface-subtle text-text-muted',
        vetoed: 'bg-warning/20 text-warning-text',
        expired: 'bg-surface-subtle text-text-muted',
        countered: 'bg-info/20 text-info',
      }
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-surface-subtle text-text-muted'}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      )
    }

    return (
      <div key={trade.id} className="bg-surface-subtle rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${isIncoming ? 'text-info' : 'text-text-muted'}`}>
              {isIncoming ? 'Incoming' : 'Outgoing'}
            </span>
            <span className="text-sm text-text-secondary">
              {isIncoming ? `from ${partnerName}` : `to ${partnerName}`}
            </span>
            {!isPending && statusBadge(trade.status)}
          </div>
          {isPending && trade.expiresAt && (
            <span className="text-xs text-text-muted">
              {getTimeRemaining(trade.expiresAt)}
            </span>
          )}
        </div>

        {/* Trade items */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-danger-text uppercase font-semibold mb-1">
              {isIncoming ? 'You Give' : 'You Offered'}
            </p>
            {myGiving.map(item => (
              <div key={item.schoolId} className="flex items-center gap-2 py-1">
                {item.logoUrl && <img src={item.logoUrl} alt="" className="w-5 h-5 object-contain" />}
                <span className="text-sm text-text-primary">{item.schoolName}</span>
              </div>
            ))}
            {myGiving.length === 0 && <p className="text-sm text-text-muted italic">None</p>}
          </div>
          <div>
            <p className="text-xs text-success-text uppercase font-semibold mb-1">
              {isIncoming ? 'You Receive' : 'You Requested'}
            </p>
            {myReceiving.map(item => (
              <div key={item.schoolId} className="flex items-center gap-2 py-1">
                {item.logoUrl && <img src={item.logoUrl} alt="" className="w-5 h-5 object-contain" />}
                <span className="text-sm text-text-primary">{item.schoolName}</span>
              </div>
            ))}
            {myReceiving.length === 0 && <p className="text-sm text-text-muted italic">None</p>}
          </div>
        </div>

        {/* Message */}
        {trade.message && (
          <p className="text-xs text-text-muted italic mb-3">&quot;{trade.message}&quot;</p>
        )}

        {/* Drop picker for uneven incoming trades */}
        {isPending && needsDrops && isIncoming && (
          <div className="mb-3">
            {!showingDropPicker ? (
              <button
                onClick={() => { setDropPickerTradeId(trade.id); setDropIds(new Set()) }}
                className="w-full bg-warning/10 border border-warning/30 text-warning-text rounded-lg p-2 text-xs"
              >
                You receive {netGain} more school(s) than you give. Select {dropsNeeded} to drop before accepting.
              </button>
            ) : (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-warning-text mb-2">
                  Select {dropsNeeded} school(s) to drop ({dropIds.size}/{dropsNeeded})
                </p>
                <div className="space-y-1">
                  {droppableSchools.map(school => {
                    const selected = dropIds.has(school.schoolId)
                    return (
                      <button
                        key={school.schoolId}
                        onClick={() => toggleDrop(school.schoolId, dropsNeeded)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                          selected
                            ? 'bg-warning/20 border border-warning/50'
                            : 'bg-surface hover:bg-surface-subtle border border-transparent'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-warning border-warning text-white' : 'border-border'
                        }`}>
                          {selected && <span className="text-[10px]">✓</span>}
                        </div>
                        <span className="text-text-primary">{school.schoolName}</span>
                        <span className="text-[10px] text-text-muted ml-auto">{school.conference}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 flex-wrap">
            {isIncoming ? (
              <>
                <button
                  onClick={() => {
                    if (needsDrops) {
                      if (!showingDropPicker) {
                        setDropPickerTradeId(trade.id)
                        setDropIds(new Set())
                        return
                      }
                      if (dropIds.size !== dropsNeeded) {
                        addToast(`Select ${dropsNeeded} school(s) to drop`, 'error')
                        return
                      }
                      handleAction(trade.id, 'accept', Array.from(dropIds))
                    } else {
                      handleAction(trade.id, 'accept')
                    }
                  }}
                  disabled={actionLoading === trade.id || (needsDrops && showingDropPicker && dropIds.size !== dropsNeeded)}
                  className="px-3 py-1.5 bg-success hover:bg-success/80 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {actionLoading === trade.id ? 'Processing...' : 'Accept'}
                </button>
                <button
                  onClick={() => handleAction(trade.id, 'reject')}
                  disabled={actionLoading === trade.id}
                  className="px-3 py-1.5 bg-danger hover:bg-danger/80 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    // Build partner roster from trade items for counter modal
                    const partnerRoster = trade.items
                      .filter(i => i.teamId === (isIncoming ? trade.proposerTeamId : trade.receiverTeamId))
                      .map(i => ({
                        schoolId: i.schoolId,
                        schoolName: i.schoolName,
                        abbreviation: null,
                        logoUrl: i.logoUrl,
                        conference: '',
                        slotNumber: 0,
                      }))
                    // We don't have the full partner roster here, so open counter modal
                    setCounterTrade(trade)
                  }}
                  disabled={actionLoading === trade.id}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-subtle text-text-primary border border-border rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Counter
                </button>
              </>
            ) : (
              <button
                onClick={() => handleAction(trade.id, 'cancel')}
                disabled={actionLoading === trade.id}
                className="px-3 py-1.5 bg-surface hover:bg-surface-subtle text-text-primary border border-border rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {actionLoading === trade.id ? 'Cancelling...' : 'Cancel Trade'}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <details open={pendingTrades.length > 0} className="bg-surface rounded-lg mb-8 border border-info/30 overflow-hidden">
        <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none bg-info/5 hover:bg-info/10 transition-colors">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            Trade Offers
            {pendingTrades.length > 0 && (
              <span className="bg-info text-white text-xs px-2 py-0.5 rounded-full">{pendingTrades.length}</span>
            )}
          </h2>
          <span className="text-text-muted text-sm">Click to {pendingTrades.length > 0 ? 'collapse' : 'expand'}</span>
        </summary>
        <div className="px-6 pb-4 space-y-3">
          {pendingTrades.length > 0 ? (
            pendingTrades.map(renderTradeCard)
          ) : (
            <p className="text-text-muted text-sm py-2">No pending trade offers.</p>
          )}

          {/* Recent trade activity */}
          {recentTrades.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-text-muted cursor-pointer hover:text-text-secondary">
                Recent Trade Activity ({recentTrades.length})
              </summary>
              <div className="space-y-3 mt-3">
                {recentTrades.slice(0, 5).map(renderTradeCard)}
              </div>
            </details>
          )}
        </div>
      </details>

      {/* Counter-offer modal — redirects to partner team page */}
      {counterTrade && (
        <CounterRedirectModal
          trade={counterTrade}
          leagueId={leagueId}
          myTeamId={myTeamId}
          onClose={() => setCounterTrade(null)}
        />
      )}
    </>
  )
}

// ── Counter Redirect Modal ────────────────────────────────

function CounterRedirectModal({
  trade,
  leagueId,
  myTeamId,
  onClose,
}: {
  trade: TradeData
  leagueId: string
  myTeamId: string
  onClose: () => void
}) {
  const partnerTeamId = trade.proposerTeamId === myTeamId ? trade.receiverTeamId : trade.proposerTeamId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-page border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-text-primary mb-3">Counter Trade</h3>
        <p className="text-sm text-text-secondary mb-4">
          To counter this trade, visit the other team&apos;s page where you can propose a new trade with the original offer visible.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface hover:bg-surface-subtle text-text-primary rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <a
            href={`/leagues/${leagueId}/team/${partnerTeamId}?counter=${trade.id}`}
            className="flex-1 px-4 py-2 bg-brand hover:bg-brand-hover text-text-primary rounded-lg font-medium text-center transition-colors"
          >
            Go to Team Page
          </a>
        </div>
      </div>
    </div>
  )
}
