'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmDialog'
import { fetchWithRetry } from '@/lib/api/fetch'
import dynamic from 'next/dynamic'

const TradeProposalModal = dynamic(() => import('./TradeProposalModal'), { ssr: false })

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
  tradesEnabled?: boolean
  maxRosterSize?: number
}

// ── Component ──────────────────────────────────────────────

export default function PendingTrades({
  trades,
  myTeamId,
  myTeamName,
  leagueId,
  myRoster,
  tradesEnabled = true,
  maxRosterSize = 12,
}: PendingTradesProps) {
  const { addToast } = useToast()
  const { confirm } = useConfirm()
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [counterTrade, setCounterTrade] = useState<TradeData | null>(null)
  const [counterPartnerRoster, setCounterPartnerRoster] = useState<RosterSchool[]>([])
  const [counterLoading, setCounterLoading] = useState(false)
  const [dropPickerTradeId, setDropPickerTradeId] = useState<string | null>(null)
  const [dropIds, setDropIds] = useState<Set<string>>(new Set())

  if (!tradesEnabled) return null

  const pendingTrades = trades.filter(t => t.status === 'proposed')
  const recentTrades = trades.filter(t => t.status !== 'proposed')

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const deadline = new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h remaining (${deadline})`
    }
    return `${hours}h remaining (${deadline})`
  }

  const handleAction = async (tradeId: string, action: 'accept' | 'reject' | 'cancel', drops?: string[]) => {
    setActionLoading(tradeId)
    try {
      const body: Record<string, unknown> = { tradeId, action }
      if (drops && drops.length > 0) {
        body.dropSchoolIds = drops
      }

      const res = await fetchWithRetry(`/api/leagues/${leagueId}/trades/action`, {
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
      router.refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : `Failed to ${action} trade`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCounter = async (trade: TradeData) => {
    const partnerTeamId = trade.proposerTeamId === myTeamId ? trade.receiverTeamId : trade.proposerTeamId
    setCounterLoading(true)
    try {
      const res = await fetchWithRetry(`/api/leagues/${leagueId}/teams/${partnerTeamId}/roster`)
      if (!res.ok) throw new Error('Failed to fetch roster')
      const data = await res.json()
      setCounterPartnerRoster((data.roster || []).map((r: Record<string, unknown>) => ({
        schoolId: r.school_id as string,
        schoolName: (r.schools as Record<string, unknown>)?.name as string || 'Unknown',
        abbreviation: (r.schools as Record<string, unknown>)?.abbreviation as string | null,
        logoUrl: (r.schools as Record<string, unknown>)?.logo_url as string | null,
        conference: (r.schools as Record<string, unknown>)?.conference as string || '',
        slotNumber: r.slot_number as number,
      })))
      setCounterTrade(trade)
    } catch {
      addToast('Failed to load roster for counter-offer', 'error')
    } finally {
      setCounterLoading(false)
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
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || 'bg-surface-subtle text-text-muted'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const renderSchoolChips = (items: TradeItem[]) =>
    items.map((item, idx) => (
      <span key={item.schoolId} className="inline-flex items-center gap-1">
        {idx > 0 && <span className="text-text-muted">,</span>}
        {item.logoUrl && <img src={item.logoUrl} alt="" className="w-4 h-4 object-contain inline" />}
        <span>{item.schoolName}</span>
      </span>
    ))

  const renderTradeRow = (trade: TradeData) => {
    const direction = getTradeDirection(trade)
    const isIncoming = direction === 'incoming'
    const isPending = trade.status === 'proposed'
    const partnerName = isIncoming ? trade.proposerTeamName : trade.receiverTeamName

    const myGiving = getMyGiving(trade)
    const myReceiving = getMyReceiving(trade)

    // Check if this is an uneven trade where I receive more than roster can hold
    const netGain = myReceiving.length - myGiving.length
    const currentRosterCount = myRoster.length
    const rosterAfterTrade = currentRosterCount + netGain
    const dropsNeeded = isIncoming && rosterAfterTrade > maxRosterSize ? rosterAfterTrade - maxRosterSize : 0
    const needsDrops = dropsNeeded > 0
    const showingDropPicker = dropPickerTradeId === trade.id

    // Schools available for dropping
    const tradeSchoolIds = new Set([
      ...myGiving.map(i => i.schoolId),
      ...myReceiving.map(i => i.schoolId),
    ])
    const droppableSchools = myRoster.filter(s => !tradeSchoolIds.has(s.schoolId))

    return (
      <div key={trade.id}>
        <div className="flex items-center gap-2 py-3 flex-wrap">
          {/* Direction badge */}
          <span className={`text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${isIncoming ? 'text-info' : 'text-text-muted'}`}>
            {isIncoming ? 'Incoming' : 'Outgoing'}
          </span>
          <span className="text-sm text-text-secondary flex-shrink-0">
            {isIncoming ? 'from ' : 'to '}
            <a href={`/leagues/${leagueId}/team/${isIncoming ? trade.proposerTeamId : trade.receiverTeamId}`} className="hover:underline">{partnerName}</a>
          </span>
          <span className="text-text-muted">—</span>
          {/* Trade details: "trade [schools] for [schools]" with logos */}
          <span className="text-sm flex items-center gap-1 flex-wrap">
            <span className="text-text-muted">trade</span>
            <span className="text-danger-text inline-flex items-center gap-1">{renderSchoolChips(myGiving)}</span>
            <span className="text-text-muted">for</span>
            <span className="text-success-text inline-flex items-center gap-1">{renderSchoolChips(myReceiving)}</span>
          </span>
          {!isPending && statusBadge(trade.status)}
          {trade.message && (
            <span className="text-xs text-text-muted italic truncate max-w-[200px]" title={trade.message}>
              &quot;{trade.message}&quot;
            </span>
          )}
          {/* Actions + expiry on the right */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {isPending && trade.expiresAt && (
              <span className="text-[10px] text-text-muted hidden md:inline">
                {getTimeRemaining(trade.expiresAt)}
              </span>
            )}
            {isPending && (
              <div className="flex gap-1.5">
                {isIncoming ? (
                  <>
                    <button
                      onClick={async () => {
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
                          if (await confirm({ title: 'Accept trade?', message: 'This cannot be undone.', variant: 'danger' })) {
                            handleAction(trade.id, 'accept', Array.from(dropIds))
                          }
                        } else {
                          if (await confirm({ title: 'Accept trade?', message: 'This cannot be undone.', variant: 'danger' })) {
                            handleAction(trade.id, 'accept')
                          }
                        }
                      }}
                      disabled={actionLoading === trade.id || (needsDrops && showingDropPicker && dropIds.size !== dropsNeeded)}
                      className="px-3 py-2 bg-success hover:bg-success/80 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === trade.id ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirm({ title: 'Reject trade?', message: 'Are you sure you want to reject this trade?', variant: 'danger' })) {
                          handleAction(trade.id, 'reject')
                        }
                      }}
                      disabled={actionLoading === trade.id}
                      className="px-3 py-2 bg-danger hover:bg-danger/80 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleCounter(trade)}
                      disabled={actionLoading === trade.id || counterLoading}
                      className="px-3 py-2 bg-surface hover:bg-surface-subtle text-text-primary border border-border rounded text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {counterLoading ? '...' : 'Counter'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleAction(trade.id, 'cancel')}
                    disabled={actionLoading === trade.id}
                    className="px-3 py-2 bg-surface hover:bg-surface-subtle text-text-primary border border-border rounded text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === trade.id ? '...' : 'Cancel'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Expiry on mobile (below the row) */}
        {isPending && trade.expiresAt && (
          <p className="text-[10px] text-text-muted md:hidden -mt-2 mb-1 pl-[52px]">
            {getTimeRemaining(trade.expiresAt)}
          </p>
        )}

        {/* Drop picker for uneven incoming trades */}
        {isPending && needsDrops && isIncoming && showingDropPicker && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-2">
            <p className="text-xs font-semibold text-warning-text mb-2">
              Select {dropsNeeded} school(s) to drop ({dropIds.size}/{dropsNeeded})
            </p>
            <div className="flex flex-wrap gap-1">
              {droppableSchools.map(school => {
                const selected = dropIds.has(school.schoolId)
                return (
                  <button
                    key={school.schoolId}
                    onClick={() => toggleDrop(school.schoolId, dropsNeeded)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                      selected
                        ? 'bg-warning/20 border border-warning/50 text-warning-text'
                        : 'bg-surface hover:bg-surface-subtle border border-transparent text-text-primary'
                    }`}
                  >
                    {selected && <span className="text-[10px]">✓</span>}
                    {school.schoolName}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <details id="trades" className="bg-surface rounded-lg mb-8 border border-info/30 overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-info/5 hover:bg-info/10 transition-colors">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            Trade Offers
            {pendingTrades.length > 0 && (
              <span className="bg-info text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingTrades.length}</span>
            )}
          </h2>
        </summary>
        <div className="px-4 pb-3">
          {pendingTrades.length > 0 ? (
            <div className="divide-y divide-border">
              {pendingTrades.map(renderTradeRow)}
            </div>
          ) : (
            <p className="text-text-muted text-xs py-2">No pending trade offers.</p>
          )}

          {/* Recent trade activity */}
          {recentTrades.length > 0 && (
            <details className="mt-2 pt-2 border-t border-border">
              <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
                Recent Trade Activity ({recentTrades.length})
              </summary>
              <div className="divide-y divide-border">
                {recentTrades.slice(0, 5).map(renderTradeRow)}
              </div>
            </details>
          )}
        </div>
      </details>

      {/* Counter-offer modal — opens TradeProposalModal directly */}
      {counterTrade && (
        <TradeProposalModal
          isOpen={true}
          onClose={() => setCounterTrade(null)}
          leagueId={leagueId}
          myTeam={{ id: myTeamId, name: myTeamName }}
          partnerTeam={{
            id: counterTrade.proposerTeamId === myTeamId ? counterTrade.receiverTeamId : counterTrade.proposerTeamId,
            name: counterTrade.proposerTeamId === myTeamId ? counterTrade.receiverTeamName : counterTrade.proposerTeamName,
          }}
          myRoster={myRoster}
          partnerRoster={counterPartnerRoster}
          schoolPointsMap={{}}
          rankingsMap={{}}
          schoolRecordsMap={{}}
          counterToTrade={{
            tradeId: counterTrade.id,
            proposerTeamId: counterTrade.proposerTeamId,
            proposerTeamName: counterTrade.proposerTeamName,
            items: counterTrade.items.map(i => ({
              schoolId: i.schoolId,
              schoolName: i.schoolName,
              direction: i.direction,
              teamId: i.teamId,
            })),
            message: counterTrade.message,
          }}
          onTradeProposed={() => router.refresh()}
          maxRosterSize={maxRosterSize}
        />
      )}
    </>
  )
}
