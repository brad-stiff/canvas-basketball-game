import { basketPosition } from '../court'
import {
  distance,
  getPossessor,
  opponents
} from '../entities'
import type { GameScene, Player, Vec2 } from '../types'
import { matchingDefender, tryReachInFoul } from './fouls'
import { effectiveRating } from './stamina'
import { turnoverToPlayer } from './turnover'

/**
 * Point between the offensive player and the hoop — never past the man,
 * never racing to their destination spot.
 */
function betweenManAndHoop(
  man: Vec2,
  basket: Vec2,
  shadeFt: number
): Vec2 {
  const dx = basket.x - man.x
  const dy = basket.y - man.y
  const len = Math.hypot(dx, dy) || 1
  const shade = Math.min(shadeFt, Math.max(1.2, len - 0.8))
  return {
    x: man.x + (dx / len) * shade,
    y: man.y + (dy / len) * shade
  }
}

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  }
}

/**
 * Guard a point slightly ahead of the man's current path without
 * committing all the way to their destination spot.
 */
function guardPoint(man: Player): Vec2 {
  const toTarget = distance(man.position, man.target)
  if (toTarget < 1.5) return { ...man.position }
  // Small lead only — enough to look reactive, not teleport to the spot
  return lerp(man.position, man.target, Math.min(0.18, 2.5 / toTarget))
}

/**
 * Man-to-man: stay between your man and the hoop based on where they are now.
 * Light help when the ball collapses toward the paint.
 */
export function updateManToManTargets(scene: GameScene): void {
  if (
    scene.phase !== 'live' &&
    scene.phase !== 'setup' &&
    scene.phase !== 'inbound'
  ) {
    return
  }
  if (scene.ball.state === 'loose') return

  const basket = basketPosition(scene.attackSide)
  const offense = scene.players.filter((p) => p.team === scene.possessionTeam)
  const ballId = scene.ball.possessorId
  const possessor = getPossessor(scene)
  const ballPos = possessor?.position ?? scene.ball.position
  const ballDistToRim = distance(ballPos, basket)
  const collapsing = ballDistToRim < 15

  for (const man of offense) {
    const defender = matchingDefender(scene, man)
    if (!defender) continue

    const onBall =
      (ballId != null && man.id === ballId) ||
      (scene.ball.state === 'passing' &&
        distance(defender.position, scene.ball.position) < 8)

    const skill = effectiveRating(defender, defender.defense) / 100
    // Keep enough gap that jerseys don't stack on top of each other
    const baseShade = onBall ? 3.2 - skill * 0.4 : 4.8 - skill * 0.5
    const mark = guardPoint(man)
    let target = betweenManAndHoop(mark, basket, Math.max(2.4, baseShade))

    if (onBall && scene.ball.state === 'held' && possessor) {
      target = betweenManAndHoop(
        possessor.position,
        basket,
        Math.max(2.2, 3.0 - skill * 0.4)
      )
    } else if (collapsing && !onBall) {
      const helpPoint = {
        x: (ballPos.x + basket.x) / 2,
        y: (ballPos.y + basket.y) / 2
      }
      const helpAmount = 0.2 + skill * 0.28
      const distToBall = distance(man.position, ballPos)
      const weakSideBonus = distToBall > 14 ? 0.15 : 0
      target = lerp(target, helpPoint, Math.min(0.55, helpAmount + weakSideBonus))
    }

    // If already way ahead of a trailing man on transition, meet them instead
    const manToBasket = distance(man.position, basket)
    const defToBasket = distance(defender.position, basket)
    const defToMan = distance(defender.position, man.position)
    if (defToBasket + 4 < manToBasket && defToMan > 10) {
      target = betweenManAndHoop(man.position, basket, Math.max(3.0, baseShade))
    }

    defender.target = target
  }
}

/** Per-second steal chance while closely guarding the ball handler. */
export function trySteal(scene: GameScene, dt: number): void {
  if (scene.phase !== 'live') return
  if (scene.ball.state !== 'held') return

  const handler = getPossessor(scene)
  if (!handler) return

  const defender = matchingDefender(scene, handler)
  if (!defender) return

  const gap = distance(defender.position, handler.position)
  if (gap > 2.8) return

  const pressure = Math.max(0, 1 - gap / 2.8)
  const rate =
    0.22 *
    (effectiveRating(defender, defender.defense) / 100) *
    pressure *
    (1 - effectiveRating(handler, handler.speed) / 160)
  if (Math.random() >= rate * dt) return

  if (Math.random() < 0.32) {
    tryReachInFoul(scene, defender)
    return
  }

  turnoverToPlayer(scene, defender, 'STEAL')
}

function distToSegment(point: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lenSq = abx * abx + aby * aby || 1
  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lenSq
  t = Math.min(1, Math.max(0, t))
  const cx = a.x + abx * t
  const cy = a.y + aby * t
  return Math.hypot(point.x - cx, point.y - cy)
}

/** True when no defender sits on the lane between two points. */
export function pathIsClear(
  scene: GameScene,
  from: Player,
  to: Vec2,
  clearance = 3.0
): boolean {
  const foes = scene.players.filter((p) => p.team !== from.team)
  if (foes.length === 0) return true

  const pathLen = distance(from.position, to)
  if (pathLen < 1) return true

  for (const foe of foes) {
    const toPath = distToSegment(foe.position, from.position, to)
    const along = distance(from.position, foe.position)
    if (toPath < clearance && along < pathLen - 0.8 && along > 1.0) {
      return false
    }
  }
  return true
}

/** True when no defender sits between the handler and the rim. */
export function laneIsOpen(scene: GameScene, handler: Player): boolean {
  const basket = basketPosition(scene.attackSide)
  return pathIsClear(scene, handler, basket, 3.2)
}

/** Deflection chance while a pass is in flight near a defender. */
export function tryPassDeflection(scene: GameScene, dt: number): void {
  if (scene.ball.state !== 'passing') return

  const ball = scene.ball
  const offensePlayer = scene.players.find(
    (p) => p.team === scene.possessionTeam
  )
  if (!offensePlayer) return
  const defense = opponents(scene, offensePlayer)

  for (const defender of defense) {
    const toBall = distance(defender.position, ball.position)
    const toLane = distToSegment(defender.position, ball.from, ball.to)
    if (toBall > 3.2 && toLane > 2.2) continue

    const rate =
      0.55 *
      (effectiveRating(defender, defender.defense) / 100) *
      (toBall < 2.5 ? 1 : 0.45)
    if (Math.random() < rate * dt) {
      if (Math.random() < 0.55) {
        turnoverToPlayer(scene, defender, 'DEFLECTION')
      } else {
        scene.ball = {
          state: 'loose',
          possessorId: null,
          position: { ...defender.position },
          flightT: 0,
          flightDuration: 0,
          from: { ...defender.position },
          to: { ...defender.position },
          shotMakes: false,
          shotIsThree: false,
          arcHeight: 0,
          velocity: {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10
          },
          shootingFoul: false,
          shooterId: null,
          passReceiverId: null
        }
        scene.callout = 'DEFLECTION'
        scene.calloutTimer = 1.0
      }
      return
    }
  }
}
