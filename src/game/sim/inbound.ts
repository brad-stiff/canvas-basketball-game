import { basketPosition } from '../court'
import {
  assignTeamTargets,
  attackSideFor,
  createHeldBall,
  otherTeam,
  resetPossessionPassing
} from '../entities'
import type { GameScene, TeamId } from '../types'
import { tryCoachSubs } from './coach'
import { deadBallDelay } from './clock'

/** After a made basket, inbound for the other team at the scored-on baseline. */
export function beginInbound(scene: GameScene): void {
  const nextTeam: TeamId = otherTeam(scene.possessionTeam)
  scene.possessionTeam = nextTeam
  scene.attackSide = attackSideFor(nextTeam)

  tryCoachSubs(scene)

  // Inbound from the defensive basket (the one just scored on).
  const defensiveSide = nextTeam === 'home' ? 'left' : 'right'
  const inboundBasket = basketPosition(defensiveSide)

  assignTeamTargets(scene)

  const inbounder =
    scene.players.find((p) => p.team === nextTeam && p.pos === 'PG') ??
    scene.players.find((p) => p.team === nextTeam && p.number === 1) ??
    scene.players.find((p) => p.team === nextTeam)

  if (!inbounder) return

  const towardCourt = nextTeam === 'home' ? 1 : -1
  inbounder.position = {
    x: inboundBasket.x + towardCourt * 2.5,
    y: 8
  }
  inbounder.target = { ...inbounder.position }

  scene.ball = createHeldBall(inbounder)
  resetPossessionPassing(scene)
  scene.shotClock = 24
  scene.shotClockRunning = false
  scene.gameClockRunning = false
  scene.phase = 'inbound'
  scene.timer = deadBallDelay(scene, 0.8)
}

export function releaseInbound(scene: GameScene): void {
  assignTeamTargets(scene)
  scene.phase = 'live'
  scene.timer = deadBallDelay(scene, 0.5)
  scene.shotClock = 24
  scene.shotClockRunning = true
  scene.gameClockRunning = true
}
