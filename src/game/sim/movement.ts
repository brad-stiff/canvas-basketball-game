import type { Player } from '../types'
import { effectiveRating } from './stamina'

/** Map a 0–100 speed rating to feet per second. */
export function speedFeetPerSecond(speedRating: number): number {
  const clamped = Math.min(100, Math.max(0, speedRating))
  return 8 + (clamped / 100) * 14
}

const ARRIVE_EPS = 0.08

/** Steer a player toward their target at rating-based speed. */
export function stepPlayerMovement(player: Player, dt: number): void {
  const dx = player.target.x - player.position.x
  const dy = player.target.y - player.position.y
  const dist = Math.hypot(dx, dy)

  if (dist <= ARRIVE_EPS) {
    player.position.x = player.target.x
    player.position.y = player.target.y
    return
  }

  const step =
    speedFeetPerSecond(effectiveRating(player, player.speed)) * dt
  if (dist <= step) {
    player.position.x = player.target.x
    player.position.y = player.target.y
    return
  }

  player.position.x += (dx / dist) * step
  player.position.y += (dy / dist) * step
}

export function playerHasArrived(player: Player): boolean {
  return (
    Math.hypot(
      player.target.x - player.position.x,
      player.target.y - player.position.y
    ) <= ARRIVE_EPS
  )
}
