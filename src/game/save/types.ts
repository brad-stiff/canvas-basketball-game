import type { League } from '../roster/types'
import type { Season } from '../season/types'

export const SAVE_VERSION = 1

export type CareerSave = {
  version: number
  savedAt: string
  league: League
  season: Season
}
