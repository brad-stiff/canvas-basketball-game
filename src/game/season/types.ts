import type { BoxScore, PlayerBoxLine } from '../types'

export type { BoxScore, PlayerBoxLine }

export type GameResult = {
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  homeName: string
  awayName: string
  homeAbbrev: string
  awayAbbrev: string
  box: BoxScore
  /** True when user team is home */
  userIsHome: boolean
}

export type ScheduledGame = {
  id: string
  /** Day index in the season (0-based) */
  day: number
  homeTeamId: string
  awayTeamId: string
  result: GameResult | null
}

export type Season = {
  id: string
  userTeamId: string
  games: ScheduledGame[]
  /** Index of the next unplayed game, or games.length if done */
  nextIndex: number
}

export type TeamRecord = {
  teamId: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}
