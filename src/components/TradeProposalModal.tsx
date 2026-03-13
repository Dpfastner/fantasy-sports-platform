'use client'

import { useState, useMemo } from 'react'
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
  maxRosterSize?: number
}

// ── Chip Component ──────────────────────────────────────────

function SchoolChip({ school, onRemove, variant }: {
  school: RosterSchool
  onRemove: () => void
  variant: 'giving' | 'receiving' | 'dropping'
}) {
  const colors = {
    giving: 'bg-danger/20 border-danger/40 text-danger-text',
    receiving: 'bg-success/20 border-success/40 text-success-text',
    dropping: 'bg-warning/20 border-warning/40 text-warning-text',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colors[variant]}`}>
      {school.logoUrl ? (
        <img src={school.logoUrl} alt="" className="w-4 h-4 object-contain" />
      ) : null}
      {school.schoolName}
      <button onClick={onRemove} className="ml-0.5 hover:opacity-70 text-current">
        &times;
      </button>
    </span>
  )
}

// ── Inline Picker ──────────────────────────────────────────

function InlinePicker({ schools, selectedIds, disabledIds, onToggle, variant, search, onSearchChange, schoolPointsMap, rankingsMap, schoolRecordsMap }: {
  schools: RosterSchool[]
  selectedIds: Set<string>
  disabledIds: Set<string>
  onToggle: (id: string) => void
  variant: 'giving' | 'receiving' | 'dropping'
  search: string
  onSearchChange: (s: string) => void
  schoolPointsMap: Record<string, number>
  rankingsMap: Record<string, number>
  schoolRecordsMap: Record<string, { wins: number; losses: number; confWins: number; confLosses: number }>
}) {
  const filtered = schools.filter(s =>
    s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
    (s.abbreviation || '').toLowerCase().includes(search.toLowerCase()) ||
    s.conference.toLowerCase().includes(search.toLowerCase())
  )

  const colors = {
    giving: { selected: 'bg-danger/20 border-danger/50', check: 'bg-danger border-danger' },
    receiving: { selected: 'bg-success/20 border-success/50', check: 'bg-success border-success' },
    dropping: { selected: 'bg-warning/20 border-warning/50', check: 'bg-warning border-warning' },
  }

  const getRecord = (schoolId: string) => {
    const r = schoolRecordsMap[schoolId]
    return r ? `${r.wins}-${r.losses}` : '-'
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search schools..."
        className="w-full px-3 py-2 bg-surface border-b border-border text-text-primary text-sm placeholder:text-text-muted outline-none"
        autoFocus
      />
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-text-muted text-sm text-center">No matching schools</p>
        ) : filtered.map(school => {
          const selected = selectedIds.has(school.schoolId)
          const disabled = disabledIds.has(school.schoolId)
          const rank = rankingsMap[school.schoolId]
          const points = schoolPointsMap[school.schoolId] || 0
          return (
            <button
              key={school.schoolId}
              onClick={() => !disabled && onToggle(school.schoolId)}
              disabled={disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : selected
                    ? colors[variant].selected
                    : 'hover:bg-surface-subtle'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                selected ? `${colors[variant].check} text-white` : 'border-border'
              }`}>
                {selected && <span className="text-[10px]">✓</span>}
              </div>
              {school.logoUrl ? (
                <img src={school.logoUrl} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <div className="w-5 h-5 bg-surface-subtle rounded flex items-center justify-center text-[9px] font-bold text-text-muted">
                  {school.abbreviation?.substring(0, 2) || school.schoolName.substring(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {rank && <span className="text-[10px] text-brand-text font-bold">#{rank}</span>}
                  <span className="text-sm font-medium text-text-primary truncate">{school.schoolName}</span>
                </div>
              </div>
              <span className="text-[11px] text-text-muted whitespace-nowrap">
                {disabled ? 'Already owned' : `${school.conference} · ${getRecord(school.schoolId)} · ${points} pts`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────

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
  maxRosterSize = 12,
}: TradeProposalModalProps) {
  const { addToast } = useToast()
  const [givingIds, setGivingIds] = useState<Set<string>>(new Set())
  const [receivingIds, setReceivingIds] = useState<Set<string>>(new Set())
  const [dropIds, setDropIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Picker visibility
  const [showGivingPicker, setShowGivingPicker] = useState(false)
  const [showReceivingPicker, setShowReceivingPicker] = useState(false)
  const [givingSearch, setGivingSearch] = useState('')
  const [receivingSearch, setReceivingSearch] = useState('')
  const [dropSearch, setDropSearch] = useState('')

  if (!isOpen) return null

  const givingCount = givingIds.size
  const receivingCount = receivingIds.size
  const netGain = receivingCount - givingCount
  const rosterAfterTrade = myRoster.length + netGain - dropIds.size
  const dropsNeeded = Math.max(0, myRoster.length + netGain - maxRosterSize)
  const needsDrops = dropsNeeded > 0

  // Disabled sets (schools already on the other roster)
  const myRosterSchoolIds = useMemo(() => new Set(myRoster.map(s => s.schoolId)), [myRoster])
  const partnerRosterSchoolIds = useMemo(() => new Set(partnerRoster.map(s => s.schoolId)), [partnerRoster])

  // Schools available for dropping
  const droppableSchools = myRoster.filter(
    s => !givingIds.has(s.schoolId)
  )

  const toggleGiving = (schoolId: string) => {
    if (!givingIds.has(schoolId) && partnerRosterSchoolIds.has(schoolId)) {
      addToast('This school is already on their roster', 'error')
      return
    }
    setGivingIds(prev => {
      const next = new Set(prev)
      if (next.has(schoolId)) next.delete(schoolId)
      else next.add(schoolId)
      return next
    })
    setDropIds(new Set())
  }

  const toggleReceiving = (schoolId: string) => {
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
  }

  const toggleDrop = (schoolId: string) => {
    setDropIds(prev => {
      const next = new Set(prev)
      if (next.has(schoolId)) next.delete(schoolId)
      else if (next.size < dropsNeeded) next.add(schoolId)
      return next
    })
  }

  const canSubmit = givingCount > 0 && receivingCount > 0 && (!needsDrops || dropIds.size === dropsNeeded)

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

  // Helper: resolve school from ID
  const findMySchool = (id: string) => myRoster.find(s => s.schoolId === id)
  const findPartnerSchool = (id: string) => partnerRoster.find(s => s.schoolId === id)

  // Roster preview
  const rosterAfterSchools = myRoster
    .filter(s => !givingIds.has(s.schoolId) && !dropIds.has(s.schoolId))
    .map(s => s.schoolName)
  const receivingSchoolNames = Array.from(receivingIds).map(id => findPartnerSchool(id)?.schoolName || 'Unknown')
  const finalRoster = [...rosterAfterSchools, ...receivingSchoolNames]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-page border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-page border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-text-primary">
            {counterToTrade ? 'Counter Trade' : `Trade with ${partnerTeam.name}`}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Counter-offer context */}
        {counterToTrade?.message && (
          <div className="mx-6 mt-4 bg-info/10 border border-info/30 rounded-lg px-4 py-3">
            <p className="text-xs text-text-secondary">
              <span className="font-semibold">Message from {counterToTrade.proposerTeamName}:</span>{' '}
              <span className="italic">&ldquo;{counterToTrade.message}&rdquo;</span>
            </p>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Two-column chip builder */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* You Give */}
            <div>
              <h3 className="text-xs font-semibold text-danger-text uppercase tracking-wide mb-2">You Give</h3>
              <div className="min-h-[44px] bg-surface-inset rounded-lg p-2 flex flex-wrap gap-1.5">
                {givingCount === 0 && !showGivingPicker && (
                  <span className="text-text-muted text-xs py-1">No schools selected</span>
                )}
                {Array.from(givingIds).map(id => {
                  const school = findMySchool(id)
                  return school ? (
                    <SchoolChip key={id} school={school} onRemove={() => { toggleGiving(id); setDropIds(new Set()) }} variant="giving" />
                  ) : null
                })}
                <button
                  onClick={() => { setShowGivingPicker(!showGivingPicker); setShowReceivingPicker(false); setGivingSearch('') }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-brand-text hover:bg-brand/10 rounded-full transition-colors"
                >
                  + Add
                </button>
              </div>
              {showGivingPicker && (
                <div className="mt-2">
                  <InlinePicker
                    schools={myRoster}
                    selectedIds={givingIds}
                    disabledIds={partnerRosterSchoolIds}
                    onToggle={toggleGiving}
                    variant="giving"
                    search={givingSearch}
                    onSearchChange={setGivingSearch}
                    schoolPointsMap={schoolPointsMap}
                    rankingsMap={rankingsMap}
                    schoolRecordsMap={schoolRecordsMap}
                  />
                </div>
              )}
            </div>

            {/* You Receive */}
            <div>
              <h3 className="text-xs font-semibold text-success-text uppercase tracking-wide mb-2">You Receive</h3>
              <div className="min-h-[44px] bg-surface-inset rounded-lg p-2 flex flex-wrap gap-1.5">
                {receivingCount === 0 && !showReceivingPicker && (
                  <span className="text-text-muted text-xs py-1">No schools selected</span>
                )}
                {Array.from(receivingIds).map(id => {
                  const school = findPartnerSchool(id)
                  return school ? (
                    <SchoolChip key={id} school={school} onRemove={() => { toggleReceiving(id); setDropIds(new Set()) }} variant="receiving" />
                  ) : null
                })}
                <button
                  onClick={() => { setShowReceivingPicker(!showReceivingPicker); setShowGivingPicker(false); setReceivingSearch('') }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-brand-text hover:bg-brand/10 rounded-full transition-colors"
                >
                  + Add
                </button>
              </div>
              {showReceivingPicker && (
                <div className="mt-2">
                  <InlinePicker
                    schools={partnerRoster}
                    selectedIds={receivingIds}
                    disabledIds={myRosterSchoolIds}
                    onToggle={toggleReceiving}
                    variant="receiving"
                    search={receivingSearch}
                    onSearchChange={setReceivingSearch}
                    schoolPointsMap={schoolPointsMap}
                    rankingsMap={rankingsMap}
                    schoolRecordsMap={schoolRecordsMap}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Inline drop picker — appears automatically when needed */}
          {needsDrops && givingCount > 0 && receivingCount > 0 && (
            <div className="bg-warning/5 border border-warning/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-warning-text mb-2">
                You need to drop {dropsNeeded} school{dropsNeeded > 1 ? 's' : ''} to make room
                <span className="font-normal text-text-muted ml-1">({dropIds.size}/{dropsNeeded} selected)</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Array.from(dropIds).map(id => {
                  const school = findMySchool(id)
                  return school ? (
                    <SchoolChip key={id} school={school} onRemove={() => toggleDrop(id)} variant="dropping" />
                  ) : null
                })}
              </div>
              <InlinePicker
                schools={droppableSchools}
                selectedIds={dropIds}
                disabledIds={new Set()}
                onToggle={toggleDrop}
                variant="dropping"
                search={dropSearch}
                onSearchChange={setDropSearch}
                schoolPointsMap={schoolPointsMap}
                rankingsMap={rankingsMap}
                schoolRecordsMap={schoolRecordsMap}
              />
            </div>
          )}

          {/* Live roster preview */}
          {(givingCount > 0 || receivingCount > 0) && (
            <div className="bg-surface-inset rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Your roster after trade</p>
                <span className={`text-xs font-medium ${
                  rosterAfterTrade > maxRosterSize ? 'text-danger-text' : 'text-text-muted'
                }`}>
                  {finalRoster.length}/{maxRosterSize} schools
                </span>
              </div>
              {rosterAfterTrade > maxRosterSize ? (
                <p className="text-xs text-danger-text">Exceeds roster limit — select drops above</p>
              ) : (
                <p className="text-xs text-text-muted">
                  {finalRoster.length === 0 ? 'Empty' : finalRoster.join(' · ')}
                </p>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Message (optional)</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note to your trade proposal..."
              maxLength={500}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted text-sm"
            />
          </div>
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
                : 'Send Proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}
