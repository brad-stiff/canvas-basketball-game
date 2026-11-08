import {
  assignTeamTargets,
  attackSideFor,
  createHeldBall
} from '../entities'
import type { GameScene, TeamId } from '../types'
import { deadBallDelay, resetPeriodClock } from './clock'
import { showCallout } from './turnover'

/** Resolve the opening tip and put the winner on offense. */
export function resolveTipOff(scene: GameScene): void {
  const winner: TeamId = Math.random() < 0.5 ? 'home' : 'away'
  const ballHandler =
    scene.players.find((p) => p.team === winner && p.number === 1) ??
    scene.players.find((p) => p.team === winner)

  if (!ballHandler) return

  scene.possessionTeam = winner
  scene.attackSide = attackSideFor(winner)
  scene.nextPeriodPossession = winner === 'home' ? 'away' : 'home'
  scene.ball = createHeldBall(ballHandler)
  scene.passesThisPossession = 0
  scene.shotClock = 24
  scene.shotClockRunning = false
  resetPeriodClock(scene, scene.quarter > 4)
  assignTeamTargets(scene)
  scene.phase = 'setup'
  scene.timer = 0
  showCallout(
    scene,
    winner === 'home' ? 'HOME WINS TIP' : 'AWAY WINS TIP',
    1.4
  )
}

export function beginTipOff(scene: GameScene): void {
  scene.phase = 'tipoff'
  scene.timer = deadBallDelay(scene, 1.6)
  scene.gameClockRunning = false
  scene.shotClockRunning = false
  scene.ball.possessorId = null
  scene.ball.state = 'held'
  scene.ball.position = { x: 0, y: 0 }
  showCallout(scene, 'JUMP BALL', scene.timer)
}
