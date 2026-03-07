'use client'

import { createContext, useContext, ReactNode } from 'react'

export interface LeagueSummary {
  id: string
  name: string
  sportName: string
  sportSlug: string
}

export interface TeamSummary {
  id: string
  name: string
  userId: string
  primaryColor: string
  secondaryColor: string
  imageUrl: string | null
}

export interface LeagueContextValue {
  currentLeague: {
    id: string
    name: string
    sportName: string
  }
  userLeagues: LeagueSummary[]
  teamsInLeague: TeamSummary[]
  userTeam: TeamSummary | null
  isCommissioner: boolean
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

export function LeagueContextProvider({
  value,
  children,
}: {
  value: LeagueContextValue
  children: ReactNode
}) {
  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeagueContext(): LeagueContextValue | null {
  return useContext(LeagueContext)
}
