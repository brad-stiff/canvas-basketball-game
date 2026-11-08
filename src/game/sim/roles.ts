import type { Player } from '../types'
import { effectiveRating } from './stamina'

export type Role = 'guard' | 'wing' | 'big'

/** Infer a light on-court role from ratings (no explicit position yet). */
export function inferRole(player: Player): Role {
  if (player.rebounding >= 76 || (player.finishing >= 76 && player.speed <= 70)) {
    return 'big'
  }
  if (player.shooting >= 74 && player.speed >= 72) {
    return 'guard'
  }
  return 'wing'
}

export function overallRating(player: Player): number {
  return (
    player.speed * 0.15 +
    player.shooting * 0.25 +
    player.finishing * 0.2 +
    player.rebounding * 0.15 +
    player.defense * 0.25
  )
}

/** Ball-handling priority for who should run the offense. */
export function handleSkill(player: Player): number {
  return (
    effectiveRating(player, player.speed) * 0.45 +
    effectiveRating(player, player.shooting) * 0.35 +
    effectiveRating(player, player.finishing) * 0.2
  )
}
