import type { TeamRoster } from './roster/types'

export type Vec2 = { x: number; y: number }

export type TeamId = 'home' | 'away'

export type CourtPos = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export type Player = {
  id: string
  team: TeamId
  name: string
  number: number
  /** Basketball position (PG/SG/…) */
  pos: CourtPos
  /** World position on the court */
  position: Vec2
  target: Vec2
  speed: number
  shooting: number
  finishing: number
  rebounding: number
  defense: number
  /** Fatigue resistance rating (static) */
  stamina: number
  /** Current energy 0–100 (drains on court, recovers on bench) */
  energy: number
}

export type BallState = 'held' | 'passing' | 'shooting' | 'loose' | 'freethrow'

export type Ball = {
  state: BallState
  possessorId: string | null
  position: Vec2
  flightT: number
  flightDuration: number
  from: Vec2
  to: Vec2
  shotMakes: boolean
  shotIsThree: boolean
  arcHeight: number
  velocity: Vec2
  /** Shooting foul on this attempt */
  shootingFoul: boolean
  /** Player who released the current shot / FT */
  shooterId: string | null
  /** Intended pass target while ball is in flight */
  passReceiverId: string | null
}

export type GamePhase =
  | 'tipoff'
  | 'setup'
  | 'live'
  | 'made'
  | 'inbound'
  | 'freethrow'
  | 'break'
  | 'final'

export type FreeThrowState = {
  shooterId: string
  remaining: number
  /** Total awarded this trip */
  awarded: number
  /** And-one after a made basket */
  andOne: boolean
}

export type PlayerBoxLine = {
  playerId: string
  name: string
  number: number
  /** Game-clock seconds played */
  minutes: number
  points: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  plusMinus: number
}

export type BoxScore = {
  home: PlayerBoxLine[]
  away: PlayerBoxLine[]
}

export type GameRosters = {
  home: TeamRoster
  away: TeamRoster
}

export type GameScene = {
  players: Player[]
  ball: Ball
  possessionTeam: TeamId
  attackSide: 'left' | 'right'
  score: { home: number; away: number }
  phase: GamePhase
  timer: number
  passesThisPossession: number
  shotClock: number
  shotClockRunning: boolean
  callout: string | null
  calloutTimer: number
  /** 1–4, or 5+ for OT */
  quarter: number
  /** Seconds left in the period */
  gameClock: number
  gameClockRunning: boolean
  /** Team fouls this period */
  teamFouls: { home: number; away: number }
  freeThrows: FreeThrowState | null
  /** Who gets the ball to start the next period (after tip) */
  nextPeriodPossession: TeamId
  teamNames: { home: string; away: string }
  teamAbbrevs: { home: string; away: string }
  teamColors: { home: string; away: string }
  teamIds: { home: string; away: string }
  boxScore: BoxScore
  /** Timeouts remaining this half */
  timeoutsLeft: { home: number; away: number }
  /** Skip long dead-ball pauses when true (headless sim) */
  fastSim: boolean
  /** Full team rosters for bench lookups */
  rosters: GameRosters
  /** Energy for players currently on the bench */
  benchEnergy: Record<string, number>
  /** Side the human coaches; null in headless sims */
  userManagedTeam: TeamId | null
  /** Game-clock seconds remaining before AI may undo user timeout swaps */
  userLineupHoldSeconds: number
}
