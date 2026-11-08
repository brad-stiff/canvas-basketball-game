import type { League } from '../roster/types'
import type { Season, TeamRecord } from './types'

export function computeStandings(league: League, season: Season): TeamRecord[] {
  const records = new Map<string, TeamRecord>()
  for (const team of league.teams) {
    records.set(team.id, {
      teamId: team.id,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0
    })
  }

  for (const game of season.games) {
    if (!game.result) continue
    const r = game.result
    const home = records.get(r.homeTeamId)
    const away = records.get(r.awayTeamId)
    if (!home || !away) continue

    home.pointsFor += r.homeScore
    home.pointsAgainst += r.awayScore
    away.pointsFor += r.awayScore
    away.pointsAgainst += r.homeScore

    if (r.homeScore > r.awayScore) {
      home.wins += 1
      away.losses += 1
    } else if (r.awayScore > r.homeScore) {
      away.wins += 1
      home.losses += 1
    }
  }

  return [...records.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    const aDiff = a.pointsFor - a.pointsAgainst
    const bDiff = b.pointsFor - b.pointsAgainst
    return bDiff - aDiff
  })
}

export function userRecord(
  season: Season
): { wins: number; losses: number } {
  let wins = 0
  let losses = 0
  for (const game of season.games) {
    if (!game.result) continue
    const r = game.result
    const userScore =
      r.homeTeamId === season.userTeamId ? r.homeScore : r.awayScore
    const oppScore =
      r.homeTeamId === season.userTeamId ? r.awayScore : r.homeScore
    if (userScore > oppScore) wins += 1
    else if (oppScore > userScore) losses += 1
  }
  return { wins, losses }
}
