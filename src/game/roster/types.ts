export type CourtPos = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export type RosterPlayer = {
  id: string
  name: string
  number: number
  pos: CourtPos
  speed: number
  shooting: number
  finishing: number
  rebounding: number
  defense: number
  stamina: number
}

export type TeamRoster = {
  id: string
  name: string
  abbrev: string
  /** Primary jersey color */
  color: string
  players: RosterPlayer[]
  /** Exactly 5 starter ids from players */
  starterIds: string[]
}

export type League = {
  userTeamId: string
  teams: TeamRoster[]
}
