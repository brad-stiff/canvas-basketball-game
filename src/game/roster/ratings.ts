import type { RosterPlayer } from './types'

export function overallRating(p: RosterPlayer): number {
  return Math.round(
    p.speed * 0.15 +
      p.shooting * 0.25 +
      p.finishing * 0.2 +
      p.rebounding * 0.15 +
      p.defense * 0.2 +
      p.stamina * 0.05
  )
}

export function clampRating(n: number): number {
  return Math.min(99, Math.max(40, Math.round(n)))
}
