import type { GameScene } from '../types'
import { clearUserLineupHold, tryCoachSubs } from './coach'
import { showCallout } from './turnover'

/** Shortened quarters so a full AI game is watchable without speed controls. */
export const QUARTER_LENGTH = 120
export const OVERTIME_LENGTH = 60
export const BREAK_LENGTH = 4
export const HALFTIME_LENGTH = 7
export const BONUS_THRESHOLD = 5

/** Collapse dead-ball pauses during headless sims. */
export function deadBallDelay(scene: { fastSim: boolean }, seconds: number): number {
  return scene.fastSim ? Math.min(0.05, seconds) : seconds
}

export function formatGameClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function resetPeriodClock(scene: GameScene, overtime = false): void {
  scene.gameClock = overtime ? OVERTIME_LENGTH : QUARTER_LENGTH
  scene.gameClockRunning = false
  scene.teamFouls = { home: 0, away: 0 }
}

export function beginPeriodBreak(scene: GameScene): void {
  scene.gameClockRunning = false
  scene.shotClockRunning = false
  scene.ball.state = 'held'
  scene.ball.possessorId = null
  scene.freeThrows = null
  clearUserLineupHold(scene)

  if (scene.quarter >= 4) {
    if (scene.score.home === scene.score.away) {
      scene.quarter += 1
      scene.phase = 'break'
      scene.timer = deadBallDelay(scene, BREAK_LENGTH)
      tryCoachSubs(scene, { force: true })
      showCallout(scene, 'OVERTIME', 2)
      return
    }
    scene.phase = 'final'
    scene.timer = 0
    const winner =
      scene.score.home > scene.score.away
        ? 'HOME WINS'
        : scene.score.away > scene.score.home
          ? 'AWAY WINS'
          : 'TIE'
    showCallout(scene, `FINAL — ${winner}`, 99)
    return
  }

  const endingQuarter = scene.quarter
  scene.quarter += 1
  if (endingQuarter === 2) {
    scene.timeoutsLeft = { home: 2, away: 2 }
  }
  scene.phase = 'break'
  scene.timer = deadBallDelay(
    scene,
    endingQuarter === 2 ? HALFTIME_LENGTH : BREAK_LENGTH
  )
  tryCoachSubs(scene, { force: true })
  showCallout(
    scene,
    endingQuarter === 2 ? 'HALFTIME' : `END OF Q${endingQuarter}`,
    scene.timer
  )
}

export function stepGameClock(scene: GameScene, dt: number): void {
  if (!scene.gameClockRunning) return
  if (scene.phase !== 'live') return

  for (const player of scene.players) {
    const line = scene.boxScore[player.team].find(
      (l) => l.playerId === player.id
    )
    if (line) line.minutes += dt
  }

  scene.gameClock = Math.max(0, scene.gameClock - dt)
  if (scene.gameClock > 0) return

  beginPeriodBreak(scene)
}

export function periodLabel(scene: GameScene): string {
  if (scene.phase === 'final') return 'FINAL'
  if (scene.quarter <= 4) return `Q${scene.quarter}`
  return `OT${scene.quarter - 4}`
}
