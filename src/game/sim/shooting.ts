import { COURT, basketPosition } from '../court'
import { distance, opponents } from '../entities'
import type { GameScene, Player } from '../types'
import { effectiveRating } from './stamina'

export function distanceToBasket(scene: GameScene, player: Player): number {
  return distance(player.position, basketPosition(scene.attackSide))
}

export function nearestOpponentDistance(
  scene: GameScene,
  player: Player
): number {
  const foes = opponents(scene, player)
  if (foes.length === 0) return 99
  return Math.min(...foes.map((f) => distance(player.position, f.position)))
}

/**
 * Rough make probability from shooter ratings, distance, and contest.
 * Returns chance in [0.05, 0.85] and whether the attempt is a three.
 */
export function evaluateShot(
  scene: GameScene,
  shooter: Player
): { chance: number; isThree: boolean; dist: number } {
  const dist = distanceToBasket(scene, shooter)
  const isThree = dist >= COURT.threePointRadius - 0.5
  const rating = isThree
    ? effectiveRating(shooter, shooter.shooting)
    : effectiveRating(shooter, shooter.finishing)

  // Ideal ranges: finishing inside ~12ft, shooting around the arc.
  const ideal = isThree ? 24 : 8
  const rangePenalty = Math.min(0.45, Math.abs(dist - ideal) * 0.025)

  const contest = nearestOpponentDistance(scene, shooter)
  const contestPenalty =
    contest < 2.5 ? 0.28 : contest < 4.5 ? 0.14 : contest < 7 ? 0.05 : 0

  // Stronger rating curve so talent gaps show up in results
  let chance = Math.pow(rating / 100, 1.15)
  chance *= isThree ? 0.78 : 0.92
  chance -= rangePenalty
  chance -= contestPenalty

  // Open catch-and-shoot threes are more makeable
  if (isThree && contest >= 5) {
    chance += 0.06
  }

  return {
    chance: Math.min(0.88, Math.max(0.04, chance)),
    isThree,
    dist
  }
}

/** Corner-ish three: deep baseline, wide of the lane. */
export function isCornerThree(scene: GameScene, player: Player): boolean {
  const dist = distanceToBasket(scene, player)
  if (dist < COURT.threePointRadius - 0.5) return false
  return Math.abs(player.position.y) >= 18
}

export function rollShotMake(chance: number): boolean {
  return Math.random() < chance
}
