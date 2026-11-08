import { basketPosition, COURT } from '../court'
import {
  assignTeamTargets,
  attackSideFor,
  createHeldBall,
  distance,
  getPlayer,
  getPossessor,
  heldBallOffset
} from '../entities'
import type { GameScene, Player, Vec2 } from '../types'
import { rollShootingFoul } from './fouls'
import { resolveShootingFoulTrip } from './freethrows'
import { applyPlusMinus, recordFieldGoalAttempt } from '../season/boxScore'
import { deadBallDelay } from './clock'
import {
  FULL_SHOT_CLOCK,
  OFFENSIVE_REBOUND_SHOT_CLOCK,
  freezeShotClock,
  resetShotClock
} from './shotClock'
import { evaluateShot, rollShotMake } from './shooting'
import { effectiveRating } from './stamina'
import { defensiveTeam, showCallout, turnoverToTeam } from './turnover'

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  }
}

const COURT_HALF_L = COURT.length / 2 - 1.5
const COURT_HALF_W = COURT.width / 2 - 1.5

function clampInBounds(p: Vec2): Vec2 {
  return {
    x: Math.min(COURT_HALF_L, Math.max(-COURT_HALF_L, p.x)),
    y: Math.min(COURT_HALF_W, Math.max(-COURT_HALF_W, p.y))
  }
}

/** Aim slightly ahead of a moving receiver so the catch meets their hands. */
function passCatchPoint(receiver: Player): Vec2 {
  const hands = heldBallOffset(receiver)
  const dx = receiver.target.x - receiver.position.x
  const dy = receiver.target.y - receiver.position.y
  const dist = Math.hypot(dx, dy)
  if (dist < 0.4) return clampInBounds(hands)
  const lead = Math.min(3.5, dist * 0.35)
  return clampInBounds({
    x: hands.x + (dx / dist) * lead,
    y: hands.y + (dy / dist) * lead
  })
}

export function startPass(scene: GameScene, from: Player, to: Player): void {
  const start = heldBallOffset(from)
  const end = passCatchPoint(to)
  const dist = distance(start, end)
  scene.passesThisPossession += 1
  scene.ball = {
    state: 'passing',
    possessorId: null,
    position: { ...start },
    flightT: 0,
    flightDuration: Math.max(0.28, dist / 42),
    from: start,
    to: end,
    shotMakes: false,
    shotIsThree: false,
    arcHeight: Math.min(4.5, 1.2 + dist * 0.06),
    velocity: { x: 0, y: 0 },
    shootingFoul: false,
    shooterId: null,
    passReceiverId: to.id
  }
}

export function startShot(scene: GameScene, shooter: Player): void {
  const start = heldBallOffset(shooter)
  const rim = basketPosition(scene.attackSide)
  const { chance, isThree, dist } = evaluateShot(scene, shooter)
  const makes = rollShotMake(chance)
  const foul = rollShootingFoul(scene, shooter)
  freezeShotClock(scene)

  if (foul) {
    showCallout(scene, 'SHOOTING FOUL', 0.9)
  }

  scene.ball = {
    state: 'shooting',
    possessorId: null,
    position: { ...start },
    flightT: 0,
    flightDuration: Math.max(0.55, 0.35 + dist / 40),
    from: start,
    to: { ...rim },
    shotMakes: makes,
    shotIsThree: isThree,
    arcHeight: Math.min(14, 6 + dist * 0.22),
    velocity: { x: 0, y: 0 },
    shootingFoul: foul,
    shooterId: shooter.id,
    passReceiverId: null
  }
}

function beginLooseBall(scene: GameScene, at: Vec2): void {
  const angle = Math.random() * Math.PI * 2
  const speed = 6 + Math.random() * 8
  scene.ball = {
    state: 'loose',
    possessorId: null,
    position: { ...at },
    flightT: 0,
    flightDuration: 0,
    from: { ...at },
    to: { ...at },
    shotMakes: false,
    shotIsThree: false,
    arcHeight: 0,
    velocity: {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    },
    shootingFoul: false,
    shooterId: null,
    passReceiverId: null
  }
}

function onShotArrive(scene: GameScene): void {
  const ball = scene.ball
  const shooter = ball.shooterId ? getPlayer(scene, ball.shooterId) : undefined
  const team = scene.possessionTeam

  if (ball.shooterId) {
    recordFieldGoalAttempt(
      scene,
      ball.shooterId,
      team,
      ball.shotIsThree,
      ball.shotMakes
    )
  }

  if (ball.shootingFoul && shooter) {
    if (ball.shotMakes) {
      const points = ball.shotIsThree ? 3 : 2
      scene.score[team] += points
      applyPlusMinus(scene, team, points)
    }
    resolveShootingFoulTrip(
      scene,
      shooter,
      ball.shotMakes,
      ball.shotIsThree
    )
    return
  }

  if (ball.shotMakes) {
    const points = ball.shotIsThree ? 3 : 2
    scene.score[team] += points
    applyPlusMinus(scene, team, points)
    scene.phase = 'made'
    scene.timer = deadBallDelay(scene, 1.1)
    scene.shotClockRunning = false
    scene.gameClockRunning = false
    scene.ball = {
      ...ball,
      state: 'held',
      possessorId: null,
      position: { ...ball.to },
      arcHeight: 0,
      flightT: 1
    }
    return
  }

  beginLooseBall(scene, {
    x: ball.to.x + (Math.random() - 0.5) * 3,
    y: ball.to.y + (Math.random() - 0.5) * 4
  })
}

function stepLooseBall(scene: GameScene, dt: number): void {
  const ball = scene.ball
  ball.position.x += ball.velocity.x * dt
  ball.position.y += ball.velocity.y * dt
  ball.velocity.x *= 0.96
  ball.velocity.y *= 0.96

  const halfL = 47
  const halfW = 25

  if (
    Math.abs(ball.position.x) > halfL ||
    Math.abs(ball.position.y) > halfW
  ) {
    turnoverToTeam(scene, defensiveTeam(scene), 'OUT OF BOUNDS')
    return
  }

  let contender: Player | undefined
  let bestScore = -Infinity
  for (const player of scene.players) {
    const d = distance(player.position, ball.position)
    if (d > 2.8) continue
    const score =
      effectiveRating(player, player.rebounding) - d * 8 + Math.random() * 25
    if (score > bestScore) {
      bestScore = score
      contender = player
    }
  }

  if (!contender) return

  const wasOffense = contender.team === scene.possessionTeam
  scene.ball = createHeldBall(contender)
  scene.possessionTeam = contender.team
  scene.attackSide = attackSideFor(contender.team)
  scene.passesThisPossession = 0
  resetShotClock(
    scene,
    wasOffense ? OFFENSIVE_REBOUND_SHOT_CLOCK : FULL_SHOT_CLOCK
  )
  assignTeamTargets(scene)
  scene.phase = 'live'
  scene.timer = wasOffense ? 0.35 : 0.55
  scene.gameClockRunning = true
  if (!wasOffense) {
    showCallout(scene, 'DEFENSIVE REBOUND', 0.9)
  }
}

export function stepBallFlight(scene: GameScene, dt: number): void {
  const ball = scene.ball

  if (ball.state === 'held') {
    const owner = getPossessor(scene)
    if (owner) {
      ball.position = heldBallOffset(owner)
    }
    return
  }

  if (ball.state === 'passing') {
    const receiver = ball.passReceiverId
      ? getPlayer(scene, ball.passReceiverId)
      : undefined
    if (receiver) {
      ball.to = passCatchPoint(receiver)
    }

    const remaining = Math.max(
      0.05,
      ball.flightDuration * (1 - Math.min(1, ball.flightT))
    )
    const step = Math.min(1, dt / remaining)
    ball.position = lerp(ball.position, ball.to, step)
    ball.flightT += dt / Math.max(0.001, ball.flightDuration)

    const arrived =
      ball.flightT >= 1 || distance(ball.position, ball.to) < 1.1
    if (!arrived) return

    let catcher = receiver
    if (!catcher || distance(catcher.position, ball.position) > 8) {
      const offense = scene.players.filter(
        (p) => p.team === scene.possessionTeam
      )
      let best: Player | undefined
      let bestDist = Infinity
      for (const p of offense) {
        const d = distance(p.position, ball.position)
        if (d < bestDist) {
          bestDist = d
          best = p
        }
      }
      catcher = best
    }
    if (catcher) {
      scene.ball = createHeldBall(catcher)
      scene.timer = 0.3 + Math.random() * 0.4
    }
    return
  }

  if (ball.state === 'shooting') {
    ball.flightT += dt / Math.max(0.001, ball.flightDuration)
    const t = Math.min(1, ball.flightT)
    ball.position = lerp(ball.from, ball.to, t)
    if (t < 1) return
    onShotArrive(scene)
    return
  }

  if (ball.state === 'loose') {
    stepLooseBall(scene, dt)
  }
}
