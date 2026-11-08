import {
  assignTeamTargets,
  attackSideFor,
  createHeldBall,
  otherTeam
} from '../entities'
import type { GameScene, TeamId } from '../types'
import { stepBallFlight } from './ballFlight'
import { deadBallDelay, resetPeriodClock, stepGameClock } from './clock'
import {
  tryPassDeflection,
  trySteal,
  updateManToManTargets
} from './defense'
import { stepFreeThrows } from './freethrows'
import { beginInbound, releaseInbound } from './inbound'
import { playerHasArrived, stepPlayerMovement } from './movement'
import { tryOffenseDecision } from './offense'
import { stepShotClock } from './shotClock'
import { updateOffensiveSpacing } from './spacing'
import { stepEnergy } from './stamina'
import { beginTipOff, resolveTipOff } from './tipoff'

function updateReboundChase(scene: GameScene): void {
  if (scene.ball.state !== 'loose') return
  for (const player of scene.players) {
    player.target = {
      x: scene.ball.position.x,
      y: scene.ball.position.y
    }
  }
}

function stepCallout(scene: GameScene, dt: number): void {
  if (scene.calloutTimer <= 0) {
    if (scene.phase !== 'final') {
      scene.callout = null
    }
    return
  }
  scene.calloutTimer = Math.max(0, scene.calloutTimer - dt)
  if (scene.calloutTimer <= 0 && scene.phase !== 'final') {
    scene.callout = null
  }
}

function startPeriodPossession(scene: GameScene, team: TeamId): void {
  scene.possessionTeam = team
  scene.attackSide = attackSideFor(team)
  scene.nextPeriodPossession = otherTeam(team)

  const handler =
    scene.players.find((p) => p.team === team && p.pos === 'PG') ??
    scene.players.find((p) => p.team === team && p.number === 1) ??
    scene.players.find((p) => p.team === team)

  if (handler) {
    scene.ball = createHeldBall(handler)
  }

  scene.passesThisPossession = 0
  scene.shotClock = 24
  scene.shotClockRunning = false
  assignTeamTargets(scene)
  scene.phase = 'setup'
  scene.timer = 0
}

function resumeAfterBreak(scene: GameScene): void {
  if (scene.quarter > 4) {
    beginTipOff(scene)
    return
  }

  resetPeriodClock(scene, false)
  startPeriodPossession(scene, scene.nextPeriodPossession)
}

export function stepScene(scene: GameScene, dt: number): void {
  if (scene.phase === 'final') {
    stepCallout(scene, dt)
    return
  }

  stepEnergy(scene, dt)

  if (scene.timer > 0) {
    scene.timer = Math.max(0, scene.timer - dt)
  }
  stepCallout(scene, dt)

  if (scene.phase === 'tipoff' && scene.timer <= 0) {
    resolveTipOff(scene)
  }

  if (scene.phase === 'break' && scene.timer <= 0) {
    resumeAfterBreak(scene)
  }

  if (scene.phase === 'made' && scene.timer <= 0) {
    beginInbound(scene)
  }

  if (scene.phase === 'inbound' && scene.timer <= 0) {
    releaseInbound(scene)
  }

  if (scene.phase === 'setup') {
    const offenseReady = scene.players
      .filter((p) => p.team === scene.possessionTeam)
      .every(playerHasArrived)
    if (offenseReady) {
      scene.phase = 'live'
      scene.timer = deadBallDelay(scene, 0.45)
      scene.shotClock = 24
      scene.shotClockRunning = true
      scene.gameClockRunning = true
    }
  }

  if (scene.phase === 'freethrow') {
    stepFreeThrows(scene, dt)
    return
  }

  if (
    scene.phase === 'tipoff' ||
    scene.phase === 'break' ||
    scene.phase === 'made'
  ) {
    return
  }

  if (scene.ball.state === 'loose') {
    updateReboundChase(scene)
  } else if (
    scene.phase === 'live' ||
    scene.phase === 'setup' ||
    scene.phase === 'inbound'
  ) {
    if (scene.phase === 'live') {
      updateOffensiveSpacing(scene)
    }
    updateManToManTargets(scene)
  }

  for (const player of scene.players) {
    stepPlayerMovement(player, dt)
  }

  if (scene.phase === 'live') {
    tryPassDeflection(scene, dt)
  }

  stepBallFlight(scene, dt)

  if (scene.ball.state !== 'loose' && scene.phase === 'live') {
    updateManToManTargets(scene)
  }

  if (scene.phase === 'live') {
    trySteal(scene, dt)
    stepShotClock(scene, dt)
    stepGameClock(scene, dt)
    tryOffenseDecision(scene)
  }
}
