import Link from 'next/link'
import { ensureContrast } from '@/lib/color-utils'
import { ReactivateLeagueButton } from '@/components/ReactivateLeagueButton'
import { NudgeCommissionerButton } from '@/components/NudgeCommissionerButton'

interface Standing {
  teamName: string
  userName: string
  totalPoints: number
  rank: number
  winnings?: number
}

interface LeagueSeason {
  id: string
  season_year: number
  champion_user_id: string | null
  final_standings: unknown
  archived_at: string
}

interface TeamData {
  id: string
  name: string
  user_id: string | null
  primary_color: string
  secondary_color: string
  image_url: string | null
  profiles: { display_name: string | null; email: string } | null
}

interface DormantLeagueViewProps {
  leagueId: string
  leagueName: string
  sportName: string
  sportId: string
  seasonName: string
  isCommissioner: boolean
  latestArchive: LeagueSeason | null
  teams: TeamData[]
  currentSeasonYear: number
}

export function DormantLeagueView({
  leagueId,
  leagueName,
  sportName,
  sportId,
  seasonName,
  isCommissioner,
  latestArchive,
  teams,
  currentSeasonYear,
}: DormantLeagueViewProps) {
  // Parse standings from archive
  let standings: Standing[] = []
  let championName: string | null = null
  let championTeamName: string | null = null
  let championPoints: number | null = null

  if (latestArchive?.final_standings) {
    const fs = latestArchive.final_standings as Record<string, unknown>
    if (fs.version === 2) {
      standings = (fs.standings as Standing[]) || []
    } else if (Array.isArray(latestArchive.final_standings)) {
      standings = latestArchive.final_standings as Standing[]
    }

    if (standings.length > 0) {
      championTeamName = standings[0].teamName
      championName = standings[0].userName
      championPoints = standings[0].totalPoints
    }
  }

  return (
    <div className="space-y-6">
      {/* Season Complete Banner */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-warning/20 via-warning/10 to-transparent px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Season Complete</h2>
              <p className="text-text-secondary text-sm">
                {sportName} &bull; {seasonName}
              </p>
            </div>
          </div>
        </div>

        {/* Champion Highlight */}
        {championName && (
          <div className="px-6 py-5 text-center">
            <p className="text-text-secondary text-xs uppercase tracking-wide mb-1">Champion</p>
            <p className="text-xl font-bold text-warning-text">{championName}</p>
            {championTeamName && championTeamName !== championName && (
              <p className="text-text-secondary text-sm">{championTeamName}</p>
            )}
            {championPoints != null && (
              <p className="text-text-muted text-sm mt-1">{championPoints} pts</p>
            )}
          </div>
        )}
      </div>

      {/* Final Standings */}
      {standings.length > 0 && (
        <div className="bg-surface rounded-lg p-4 md:p-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Final Standings</h3>
          <div className="space-y-2">
            {standings.map((team, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2 rounded ${
                  i === 0 ? 'bg-surface' : 'bg-surface-inset'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-center ${
                    i === 0 ? 'text-warning-text' : 'text-text-muted'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-text-primary text-sm font-medium">{team.userName}</p>
                    {team.teamName !== team.userName && (
                      <p className="text-text-muted text-xs">{team.teamName}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-text-primary text-sm font-medium">{team.totalPoints} pts</p>
                  {team.winnings != null && team.winnings > 0 && (
                    <p className="text-success-text text-xs">${team.winnings}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href={`/leagues/${leagueId}/history`}
              className="text-brand-text hover:text-brand-text/80 text-sm transition-colors"
            >
              View Full History →
            </Link>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-surface rounded-lg p-4 md:p-6">
        {isCommissioner ? (
          <div className="text-center space-y-3">
            <p className="text-text-secondary text-sm">
              Ready for a new season? Reactivate this league to draft with the same members.
            </p>
            <ReactivateLeagueButton
              leagueId={leagueId}
              sportId={sportId}
              currentSeasonYear={currentSeasonYear}
            />
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-text-secondary text-sm">
              Waiting for your commissioner to start a new season.
            </p>
            <NudgeCommissionerButton leagueId={leagueId} />
          </div>
        )}
      </div>

      {/* Member List */}
      <div className="bg-surface rounded-lg p-4 md:p-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
          Members ({teams.length})
        </h3>
        <div className="space-y-3">
          {teams.map(team => {
            const profile = team.profiles as { display_name: string | null; email: string } | null
            return (
              <div key={team.id} className="flex items-center gap-3">
                {team.image_url ? (
                  <img src={team.image_url} alt={team.name} className="w-8 h-8 object-contain rounded" />
                ) : (
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: team.primary_color || '#374151',
                      color: ensureContrast(team.primary_color || '#374151', team.secondary_color || '#ffffff'),
                    }}
                  >
                    {team.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{team.name}</p>
                  <Link
                    href={`/profile/${team.user_id}`}
                    className="text-text-muted text-xs truncate hover:underline block"
                  >
                    {profile?.display_name || profile?.email?.split('@')[0] || 'Unknown'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
