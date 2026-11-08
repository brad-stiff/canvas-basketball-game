import { distance, getPossessor } from '../entities'
import type { GameScene, Player } from '../types'
import { BONUS_THRESHOLD } from './clock'
import { beginFreeThrows } from './freethrows'
import { effectiveRating } from './stamina'
import { showCallout } from './turnover'

/** Pair by on-court slot (stable index), not jersey number. */
export function matchingDefender(
  scene: GameScene,
  offensePlayer: Player
): Player | undefined {
  const offense = scene.players.filter((p) => p.team === scene.possessionTeam)
  const defense = scene.players.filter((p) => p.team !== scene.possessionTeam)
  const idx = offense.findIndex((p) => p.id === offensePlayer.id)
  if (idx < 0) return undefined
  return defense[idx]
}

export function recordTeamFoul(scene: GameScene, foulingTeam: 'home' | 'away'): void {
  scene.teamFouls[foulingTeam] += 1
}

export function defenseInBonus(scene: GameScene): boolean {
  // Bonus is against the defending team’s foul count
  const defense = scene.possessionTeam === 'home' ? 'away' : 'home'
  return scene.teamFouls[defense] >= BONUS_THRESHOLD
}

/**
 * Reach-in / non-shooting foul. Returns true if a foul was whistled
 * (caller should skip the steal).
 */
export function tryReachInFoul(scene: GameScene, defender: Player): boolean {
  const handler = getPossessor(scene)
  if (!handler) return false

  recordTeamFoul(scene, defender.team)

  if (defenseInBonus(scene)) {
    showCallout(scene, 'FOUL — BONUS')
    beginFreeThrows(scene, handler, 2, false)
    return true
  }

  // Not in bonus: inbound for offense from the sideline (spot of foul)
  showCallout(scene, 'FOUL')
  scene.ball = {
    ...scene.ball,
    state: 'held',
    possessorId: handler.id
  }
  scene.timer = 0.7
  scene.shotClock = Math.max(scene.shotClock, 14)
  scene.shotClockRunning = true
  scene.phase = 'live'
  return true
}

/** Roll a shooting foul on a contested shot attempt. */
export function rollShootingFoul(
  scene: GameScene,
  shooter: Player
): boolean {
  const defender = matchingDefender(scene, shooter)
  if (!defender) return false

  const gap = distance(defender.position, shooter.position)
  if (gap > 3.2) return false

  const pressure = Math.max(0, 1 - gap / 3.2)
  const chance =
    0.18 * (effectiveRating(defender, defender.defense) / 100) * pressure +
    0.04
  if (Math.random() > chance) return false

  recordTeamFoul(scene, defender.team)
  return true
}
