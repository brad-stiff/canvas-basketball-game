import { basketPosition } from '../court'
import {
  createHeldBall,
  getPlayer,
  heldBallOffset
} from '../entities'
import { applyPlusMinus, recordFreeThrow } from '../season/boxScore'
import type { GameScene, Player } from '../types'
import { tryCoachSubs } from './coach'
import { deadBallDelay } from './clock'
import { beginInbound } from './inbound'
import { effectiveRating } from './stamina'
import { showCallout } from './turnover'

function freeThrowSpot(scene: GameScene): { x: number; y: number } {
  const basket = basketPosition(scene.attackSide)
  const towardCenter = scene.attackSide === 'right' ? -1 : 1
  return {
    x: basket.x + towardCenter * 15,
    y: 0
  }
}

function placeForFreeThrows(scene: GameScene, shooter: Player): void {
  const spot = freeThrowSpot(scene)
  shooter.position = { ...spot }
  shooter.target = { ...spot }

  const basket = basketPosition(scene.attackSide)
  const towardCenter = scene.attackSide === 'right' ? -1 : 1
  let laneI = 0
  for (const player of scene.players) {
    if (player.id === shooter.id) continue
    const side = laneI % 2 === 0 ? -1 : 1
    const depth = 8 + Math.floor(laneI / 2) * 3
    player.position = {
      x: basket.x + towardCenter * depth,
      y: side * (6 + (laneI % 2) * 2)
    }
    player.target = { ...player.position }
    laneI += 1
  }
}

export function beginFreeThrows(
  scene: GameScene,
  shooter: Player,
  count: number,
  andOne: boolean
): void {
  tryCoachSubs(scene, { protectIds: [shooter.id] })
  const liveShooter = getPlayer(scene, shooter.id) ?? shooter
  placeForFreeThrows(scene, liveShooter)
  scene.ball = createHeldBall(liveShooter)
  scene.freeThrows = {
    shooterId: liveShooter.id,
    remaining: count,
    awarded: count,
    andOne
  }
  scene.phase = 'freethrow'
  scene.timer = deadBallDelay(scene, 0.85)
  scene.gameClockRunning = false
  scene.shotClockRunning = false
  showCallout(scene, andOne ? 'AND-ONE' : `${count} FREE THROWS`, 1.1)
}

export function launchFreeThrow(scene: GameScene): void {
  if (!scene.freeThrows) return
  const shooter = getPlayer(scene, scene.freeThrows.shooterId)
  if (!shooter) return

  const rim = basketPosition(scene.attackSide)
  const start = heldBallOffset(shooter)
  const chance = Math.min(
    0.92,
    Math.max(
      0.45,
      effectiveRating(shooter, shooter.shooting) / 100 + 0.05
    )
  )
  const makes = Math.random() < chance

  scene.ball = {
    state: 'freethrow',
    possessorId: null,
    position: { ...start },
    flightT: 0,
    flightDuration: 0.85,
    from: start,
    to: { ...rim },
    shotMakes: makes,
    shotIsThree: false,
    arcHeight: 9,
    velocity: { x: 0, y: 0 },
    shootingFoul: false,
    shooterId: shooter.id,
    passReceiverId: null
  }
  scene.timer = 0
}

function onFreeThrowArrive(scene: GameScene): void {
  if (!scene.freeThrows) return
  const ft = scene.freeThrows

  recordFreeThrow(
    scene,
    ft.shooterId,
    scene.possessionTeam,
    scene.ball.shotMakes
  )

  if (scene.ball.shotMakes) {
    scene.score[scene.possessionTeam] += 1
    applyPlusMinus(scene, scene.possessionTeam, 1)
    showCallout(scene, 'FREE THROW GOOD', 0.8)
  } else {
    showCallout(scene, 'FREE THROW MISS', 0.8)
  }

  ft.remaining -= 1

  if (ft.remaining <= 0 && !scene.ball.shotMakes) {
    scene.freeThrows = null
    scene.phase = 'live'
    scene.ball = {
      state: 'loose',
      possessorId: null,
      position: {
        x: scene.ball.to.x + (Math.random() - 0.5) * 2,
        y: scene.ball.to.y + (Math.random() - 0.5) * 3
      },
      flightT: 0,
      flightDuration: 0,
      from: { ...scene.ball.to },
      to: { ...scene.ball.to },
      shotMakes: false,
      shotIsThree: false,
      arcHeight: 0,
      velocity: {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8
      },
      shootingFoul: false,
      shooterId: null,
      passReceiverId: null
    }
    scene.gameClockRunning = true
    return
  }

  if (ft.remaining <= 0) {
    scene.freeThrows = null
    beginInbound(scene)
    return
  }

  const shooter = getPlayer(scene, ft.shooterId)
  if (shooter) {
    scene.ball = createHeldBall(shooter)
  }
  scene.timer = deadBallDelay(scene, 0.75)
}

export function stepFreeThrows(scene: GameScene, dt: number): void {
  if (scene.phase !== 'freethrow' || !scene.freeThrows) return

  if (scene.ball.state === 'freethrow') {
    const ball = scene.ball
    ball.flightT += dt / Math.max(0.001, ball.flightDuration)
    const t = Math.min(1, ball.flightT)
    ball.position = {
      x: ball.from.x + (ball.to.x - ball.from.x) * t,
      y: ball.from.y + (ball.to.y - ball.from.y) * t
    }
    if (t >= 1) {
      onFreeThrowArrive(scene)
    }
    return
  }

  if (scene.timer > 0) return
  launchFreeThrow(scene)
}

export function resolveShootingFoulTrip(
  scene: GameScene,
  shooter: Player,
  madeBasket: boolean,
  isThree: boolean
): void {
  if (madeBasket) {
    beginFreeThrows(scene, shooter, 1, true)
    return
  }
  beginFreeThrows(scene, shooter, isThree ? 3 : 2, false)
}
