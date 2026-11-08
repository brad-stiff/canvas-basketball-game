import type { League } from '../roster/types'
import type { Season, ScheduledGame } from './types'

/**
 * Short season: user plays each opponent once at home and once away (10 games).
 */
export function createSeason(league: League): Season {
  const userId = league.userTeamId
  const opponents = league.teams.filter((t) => t.id !== userId)
  const games: ScheduledGame[] = []
  let day = 0

  for (const opp of opponents) {
    games.push({
      id: `g-${day}-h`,
      day,
      homeTeamId: userId,
      awayTeamId: opp.id,
      result: null
    })
    day += 1
    games.push({
      id: `g-${day}-a`,
      day,
      homeTeamId: opp.id,
      awayTeamId: userId,
      result: null
    })
    day += 1
  }

  return {
    id: `season-${Date.now()}`,
    userTeamId: userId,
    games,
    nextIndex: 0
  }
}

export function nextGame(season: Season): ScheduledGame | null {
  return season.games[season.nextIndex] ?? null
}

export function seasonComplete(season: Season): boolean {
  return season.nextIndex >= season.games.length
}

export function applyGameResult(
  season: Season,
  gameId: string,
  result: import('./types').GameResult
): Season {
  const games = season.games.map((g) =>
    g.id === gameId ? { ...g, result } : g
  )
  const idx = games.findIndex((g) => g.id === gameId)
  const nextIndex =
    idx === season.nextIndex ? season.nextIndex + 1 : season.nextIndex

  return { ...season, games, nextIndex }
}
