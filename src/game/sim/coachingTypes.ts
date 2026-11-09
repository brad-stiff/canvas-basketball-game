export type OffensivePlayId =
  | 'isolation'
  | 'pickAndRoll'
  | 'motion'
  | 'postUp'
  | 'quickHitters'

export type DefensiveScheme = 'man' | 'zone' | 'boxAnd1'

export type ScreenDefense = 'fightOver' | 'goUnder'

export type UserCoaching = {
  playQueue: OffensivePlayId[]
  /** Prefer feeding this on-court player; null = AI pick */
  attackPlayerId: string | null
  scheme: DefensiveScheme
  screenDefense: ScreenDefense
}

export const OFFENSIVE_PLAYS: {
  id: OffensivePlayId
  label: string
}[] = [
  { id: 'isolation', label: 'Isolation' },
  { id: 'pickAndRoll', label: 'Pick & roll' },
  { id: 'motion', label: 'Motion' },
  { id: 'postUp', label: 'Post up' },
  { id: 'quickHitters', label: 'Quick hitters' }
]

export const DEFENSIVE_SCHEMES: {
  id: DefensiveScheme
  label: string
}[] = [
  { id: 'man', label: 'Man to man' },
  { id: 'zone', label: 'Zone' },
  { id: 'boxAnd1', label: 'Box and 1' }
]

export const SCREEN_DEFENSES: {
  id: ScreenDefense
  label: string
}[] = [
  { id: 'fightOver', label: 'Fight over' },
  { id: 'goUnder', label: 'Go under' }
]

export function createDefaultUserCoaching(): UserCoaching {
  return {
    playQueue: ['motion'],
    attackPlayerId: null,
    scheme: 'man',
    screenDefense: 'fightOver'
  }
}
