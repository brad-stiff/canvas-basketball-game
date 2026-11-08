import { SAVE_VERSION, type CareerSave } from '@game/save/types'
import type { League } from '@game/roster/types'
import type { Season } from '@game/season/types'

export function buildCareerSave(league: League, season: Season): CareerSave {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    league,
    season
  }
}

export function isCareerSave(data: unknown): data is CareerSave {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    d.version === SAVE_VERSION &&
    typeof d.league === 'object' &&
    d.league != null &&
    typeof d.season === 'object' &&
    d.season != null
  )
}

export async function loadCareer(): Promise<CareerSave | null> {
  if (!window.api?.saveRead) return null
  const result = await window.api.saveRead()
  if (!result.ok) return null
  if (!isCareerSave(result.data)) return null
  return result.data
}

export async function writeCareer(
  league: League,
  season: Season
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (!window.api?.saveWrite) {
    return { ok: false, message: 'Save API unavailable' }
  }
  try {
    const res = await window.api.saveWrite(buildCareerSave(league, season))
    return res
  } catch (err) {
    return { ok: false, message: String(err) }
  }
}

export async function clearCareer(): Promise<void> {
  if (!window.api?.saveClear) return
  await window.api.saveClear()
}
