import type { GameScene, TeamId } from '../types'
import { showCallout } from './turnover'

export function canCallTimeout(scene: GameScene, team: TeamId): boolean {
  if (scene.phase !== 'live') return false
  if (scene.ball.state !== 'held') return false
  if (scene.possessionTeam !== team) return false
  if (scene.timeoutsLeft[team] <= 0) return false
  return true
}

/** Consume a timeout for the team. Caller pauses the loop / opens UI. */
export function callTimeout(scene: GameScene, team: TeamId): boolean {
  if (!canCallTimeout(scene, team)) return false
  scene.timeoutsLeft[team] -= 1
  scene.gameClockRunning = false
  scene.shotClockRunning = false
  showCallout(scene, 'TIMEOUT', 1.2)
  return true
}

export function resumeAfterTimeout(scene: GameScene): void {
  if (scene.phase !== 'live') return
  scene.shotClockRunning = scene.ball.state === 'held'
  scene.gameClockRunning = true
}
