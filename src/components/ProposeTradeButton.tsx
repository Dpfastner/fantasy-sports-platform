'use client'

import { useState } from 'react'
import TradeProposalModal from './TradeProposalModal'

interface RosterSchool {
  schoolId: string
  schoolName: string
  abbreviation: string | null
  logoUrl: string | null
  conference: string
  slotNumber: number
}

interface Props {
  leagueId: string
  myTeam: { id: string; name: string }
  partnerTeam: { id: string; name: string }
  myRoster: RosterSchool[]
  partnerRoster: RosterSchool[]
  schoolPointsMap: Record<string, number>
  rankingsMap: Record<string, number>
  schoolRecordsMap: Record<string, { wins: number; losses: number; confWins: number; confLosses: number }>
  buttonStyle?: { backgroundColor?: string; color?: string }
}

export default function ProposeTradeButton({
  leagueId,
  myTeam,
  partnerTeam,
  myRoster,
  partnerRoster,
  schoolPointsMap,
  rankingsMap,
  schoolRecordsMap,
  buttonStyle,
}: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
        style={buttonStyle}
      >
        Propose Trade
      </button>

      <TradeProposalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        leagueId={leagueId}
        myTeam={myTeam}
        partnerTeam={partnerTeam}
        myRoster={myRoster}
        partnerRoster={partnerRoster}
        schoolPointsMap={schoolPointsMap}
        rankingsMap={rankingsMap}
        schoolRecordsMap={schoolRecordsMap}
        onTradeProposed={() => {
          window.location.reload()
        }}
      />
    </>
  )
}
