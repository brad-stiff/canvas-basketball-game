import type { GameScene } from '../types'
import { defensiveTeam, turnoverToTeam } from './turnover'

export const FULL_SHOT_CLOCK = 24
export const OFFENSIVE_REBOUND_SHOT_CLOCK = 14

export function resetShotClock(scene: GameScene, seconds: number): void {
  scene.shotClock = seconds
  scene.shotClockRunning = true
}

export function freezeShotClock(scene: GameScene): void {
  scene.shotClockRunning = false
}

export function stepShotClock(scene: GameScene, dt: number): void {
  if (!scene.shotClockRunning) return
  if (scene.phase !== 'live') return
  if (scene.ball.state === 'shooting') return

  scene.shotClock = Math.max(0, scene.shotClock - dt)

  if (scene.shotClock > 0) return

  turnoverToTeam(scene, defensiveTeam(scene), 'SHOT CLOCK VIOLATION')
}
