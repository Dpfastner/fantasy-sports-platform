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

interface TradeItemDisplay {
  schoolId: string
  schoolName: string
  direction: 'giving' | 'receiving'
  teamId: string
}

interface CounterTradeInfo {
  tradeId: string
  proposerTeamId: string
  proposerTeamName: string
  items: TradeItemDisplay[]
  message?: string | null
}

interface TradeProposalModalProps {
  isOpen: boolean
  onClose: () => void
  leagueId: string
  myTeam: { id: string; name: string }
  partnerTeam: { id: string; name: string }
  myRoster: RosterSchool[]
  partnerRoster: RosterSchool[]
  schoolPointsMap: Record<string, number>
  rankingsMap: Record<string, number>
  schoolRecordsMap: Record<string, { wins: number; losses: number; confWins: number; confLosses: number }>
  counterToTrade?: CounterTradeInfo
  onTradeProposed?: () => void
}

// ── Component ──────────────────────────────────────────────

export default function TradeProposalModal({
  isOpen,
  onClose,
  leagueId,
  myTeam,
  partnerTeam,
  myRoster,
  partnerRoster,
  schoolPointsMap,
  rankingsMap,
  schoolRecordsMap,
  counterToTrade,
  onTradeProposed,
}: TradeProposalModalProps) {
  const { addToast } = useToast()
  const [givingIds, setGivingIds] = useState<Set<string>>(new Set())
  const [receivingIds, setReceivingIds] = useState<Set<string>>(new Set())
  const [dropIds, setDropIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showDropPicker, setShowDropPicker] = useState(false)

  if (!isOpen) return null

  const givingCount = givingIds.size
  const receivingCount = receivingIds.size
  const netGain = receivingCount - givingCount
  const needsDrops = netGain > 0
  const dropsNeeded = needsDrops ? netGain : 0
  const dropsSelected = dropIds.size

  // Schools available for dropping (on my roster, not being traded)
  const droppableSchools = myRoster.filter(
    s => !givingIds.has(s.schoolId) && !receivingIds.has(s.schoolId)
  )

  const toggleGiving = (schoolId: string) => {
    setGivingIds(prev => {
      const next = new Set(prev)
      if (next.has(schoolId)) next.delete(schoolId)
      else next.add(schoolId)
      return next
    })
    // Reset drops when trade changes
    setDropIds(new Set())
    setShowDropPicker(false)
  }

  // Set of school IDs on my roster (for blocking duplicate selections)
  const myRosterSchoolIds = new Set(myRoster.map(s => s.schoolId))

  const toggleReceiving = (schoolId: string) => {
    // Don't allow selecting a school that's already on my roster
    if (!receivingIds.has(schoolId) && myRosterSchoolIds.has(schoolId)) {
      addToast('This school is already on your roster', 'error')
      return
    }
    setReceivingIds(prev => {
      const next = new Set(prev)
      if (next.has(schoolId)) next.delete(schoolId)
      else next.add(schoolId)
      return next
    })
    setDropIds(new Set())
    setShowDropPicker(false)
  }

  const toggleDrop = (schoolId: string) => {
    setDropIds(prev => {
      const next = new Set(prev)
      if (next.has(schoolId)) next.delete(schoolId)
      else if (next.size < dropsNeeded) next.add(schoolId)
      return next
    })
  }

  const canSubmit = givingCount > 0 && receivingCount > 0 && (!needsDrops || dropsSelected === dropsNeeded)

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)

    try {
      const body: Record<string, unknown> = {
        receiverTeamId: partnerTeam.id,
        giving: Array.from(givingIds),
        receiving: Array.from(receivingIds),
        message: message.trim() || undefined,
      }

      if (counterToTrade) {
        body.counterToTradeId = counterToTrade.tradeId
      }

      if (needsDrops && dropIds.size > 0) {
        body.dropSchoolIds = Array.from(dropIds)
      }

      const res = await fetch(`/api/leagues/${leagueId}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to propose trade')
      }

      addToast(counterToTrade ? 'Counter-offer sent!' : 'Trade proposed!', 'success')
      onClose()
      onTradeProposed?.()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to propose trade', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const getRecord = (schoolId: string) => {
    const r = schoolRecordsMap[schoolId]
    return r ? `${r.wins}-${r.losses}` : '-'
  }

  const getRank = (schoolId: string) => {
    const rank = rankingsMap[schoolId]
    return rank ? `#${rank}` : null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-page border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-page border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-text-primary">
            {counterToTrade ? 'Counter Trade' : `Propose Trade to ${partnerTeam.name}`}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Counter-offer message */}
        {counterToTrade?.message && (
          <div className="mx-6 mt-4 bg-info/10 border border-info/30 rounded-lg px-4 py-3">
            <p className="text-xs text-text-secondary">
              <span className="font-semibold">Message from {counterToTrade.proposerTeamName}:</span>{' '}
              <span className="italic">"{counterToTrade.message}"</span>
            </p>
          </div>
        )}

        {/* Two-column roster selection */}
        <div className="grid md:grid-cols-2 gap-4 p-6">
          {/* Left: My Roster (giving away) */}
          <div>
            {counterToTrade && (() => {
              const wantedSchools = counterToTrade.items.filter(i => i.teamId !== counterToTrade.proposerTeamId && i.direction === 'giving')
              return wantedSchools.length > 0 ? (
                <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">Originally wanted from you</p>
                  <p className="text-xs text-danger-text font-medium">{wantedSchools.map(i => i.schoolName).join(', ')}</p>
                </div>
              ) : null
            })()}
            <h3 className="text-sm font-semibold text-danger-text mb-3 uppercase tracking-wide">
              Your Roster — Select to Give
            </h3>
            <div className="space-y-1">
              {myRoster.map(school => {
                const selected = givingIds.has(school.schoolId)
                const rank = getRank(school.schoolId)
                const points = schoolPointsMap[school.schoolId] || 0
                return (
                  <button
                    key={school.schoolId}
                    onClick={() => toggleGiving(school.schoolId)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selected
                        ? 'bg-danger/20 border border-danger/50'
                        : 'bg-surface hover:bg-surface-subtle border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-danger border-danger text-white' : 'border-border'
                    }`}>
                      {selected && <span className="text-xs">✓</span>}
                    </div>
                    {school.logoUrl ? (
                      <img src={school.logoUrl} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <div className="w-6 h-6 bg-surface-subtle rounded flex items-center justify-center text-[10px] font-bold text-text-muted">
                        {school.abbreviation?.substring(0, 2) || school.schoolName.substring(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {rank && <span className="text-[10px] text-brand-text font-bold">{rank}</span>}
                        <span className="text-sm font-medium text-text-primary truncate">{school.schoolName}</span>
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {school.conference} · {getRecord(school.schoolId)} · {points} pts
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Partner Roster (requesting) */}
          <div>
            {counterToTrade && (() => {
              const offeredSchools = counterToTrade.items.filter(i => i.teamId === counterToTrade.proposerTeamId && i.direction === 'giving')
              return offeredSchools.length > 0 ? (
                <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">Originally offered to you</p>
                  <p className="text-xs text-success-text font-medium">{offeredSchools.map(i => i.schoolName).join(', ')}</p>
                </div>
              ) : null
            })()}
            <h3 className="text-sm font-semibold text-success-text mb-3 uppercase tracking-wide">
              {partnerTeam.name}'s Roster — Select to Receive
            </h3>
            <div className="space-y-1">
              {partnerRoster.map(school => {
                const selected = receivingIds.has(school.schoolId)
                const alreadyOnMyRoster = myRosterSchoolIds.has(school.schoolId)
                const rank = getRank(school.schoolId)
                const points = schoolPointsMap[school.schoolId] || 0
                return (
                  <button
                    key={school.schoolId}
                    onClick={() => toggleReceiving(school.schoolId)}
                    disabled={alreadyOnMyRoster}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      alreadyOnMyRoster
                        ? 'bg-surface/50 opacity-40 cursor-not-allowed border border-transparent'
                        : selected
                          ? 'bg-success/20 border border-success/50'
                          : 'bg-surface hover:bg-surface-subtle border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-success border-success text-white' : 'border-border'
                    }`}>
                      {selected && <span className="text-xs">✓</span>}
                    </div>
                    {school.logoUrl ? (
                      <img src={school.logoUrl} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <div className="w-6 h-6 bg-surface-subtle rounded flex items-center justify-center text-[10px] font-bold text-text-muted">
                        {school.abbreviation?.substring(0, 2) || school.schoolName.substring(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {rank && <span className="text-[10px] text-brand-text font-bold">{rank}</span>}
                        <span className="text-sm font-medium text-text-primary truncate">{school.schoolName}</span>
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {alreadyOnMyRoster
                          ? 'Already on your roster'
                          : `${school.conference} · ${getRecord(school.schoolId)} · ${points} pts`
                        }
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Drop picker for uneven trades */}
        {needsDrops && givingCount > 0 && receivingCount > 0 && (
          <div className="mx-6 mb-4">
            {!showDropPicker ? (
              <button
                onClick={() => setShowDropPicker(true)}
                className="w-full bg-warning/10 border border-warning/30 text-warning-text rounded-lg p-3 text-sm"
              >
                You are receiving {netGain} more school(s) than you are giving. You need to drop {dropsNeeded} school(s) to make room. Click to select.
              </button>
            ) : (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-warning-text mb-3">
                  Select {dropsNeeded} school(s) to drop ({dropsSelected}/{dropsNeeded})
                </p>
                <div className="space-y-1">
                  {droppableSchools.map(school => {
                    const selected = dropIds.has(school.schoolId)
                    return (
                      <button
                        key={school.schoolId}
                        onClick={() => toggleDrop(school.schoolId)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          selected
                            ? 'bg-warning/20 border border-warning/50'
                            : 'bg-surface hover:bg-surface-subtle border border-transparent'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-warning border-warning text-white' : 'border-border'
                        }`}>
                          {selected && <span className="text-xs">✓</span>}
                        </div>
                        <span className="text-sm text-text-primary">{school.schoolName}</span>
                        <span className="text-[11px] text-text-muted ml-auto">{school.conference}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trade summary */}
        {(givingCount > 0 || receivingCount > 0) && (
          <div className="mx-6 mb-4 bg-surface-inset rounded-lg p-4">
            <p className="text-sm font-semibold text-text-primary mb-2">Trade Summary</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-danger-text text-xs uppercase mb-1">You Give</p>
                {Array.from(givingIds).map(id => {
                  const school = myRoster.find(s => s.schoolId === id)
                  return <p key={id} className="text-text-secondary">{school?.schoolName || id}</p>
                })}
                {givingCount === 0 && <p className="text-text-muted italic">None selected</p>}
              </div>
              <div>
                <p className="text-success-text text-xs uppercase mb-1">You Receive</p>
                {Array.from(receivingIds).map(id => {
                  const school = partnerRoster.find(s => s.schoolId === id)
                  return <p key={id} className="text-text-secondary">{school?.schoolName || id}</p>
                })}
                {receivingCount === 0 && <p className="text-text-muted italic">None selected</p>}
              </div>
            </div>
            {dropIds.size > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-warning-text text-xs uppercase mb-1">Dropping</p>
                {Array.from(dropIds).map(id => {
                  const school = myRoster.find(s => s.schoolId === id)
                  return <p key={id} className="text-text-secondary text-sm">{school?.schoolName || id}</p>
                })}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        <div className="mx-6 mb-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            maxLength={500}
            rows={2}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-page border-t border-border px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-surface hover:bg-surface-subtle text-text-primary rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 px-4 py-3 bg-brand hover:bg-brand-hover text-text-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Sending...'
              : counterToTrade
                ? 'Send Counter'
                : 'Propose Trade'}
          </button>
        </div>
      </div>
    </div>
  )
}
