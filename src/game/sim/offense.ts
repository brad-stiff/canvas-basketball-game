import { basketPosition } from '../court'
import { distance, getPossessor, teammates } from '../entities'
import type { GameScene, Player, Vec2 } from '../types'
import { startPass, startShot } from './ballFlight'
import { laneIsOpen, pathIsClear } from './defense'
import { playerHasArrived } from './movement'
import { handleSkill, inferRole } from './roles'
import {
  distanceToBasket,
  evaluateShot,
  isCornerThree,
  nearestOpponentDistance
} from './shooting'
import { driveTarget } from './spacing'
import { effectiveRating } from './stamina'

type ActionKind = 'shoot' | 'pass' | 'drive' | 'hold'

type ScoredAction = {
  kind: ActionKind
  score: number
  passTo?: Player
  driveTo?: Vec2
}

function pickPassTarget(scene: GameScene, handler: Player): Player | undefined {
  const mates = teammates(scene, handler)
  if (mates.length === 0) return undefined

  let best: Player | undefined
  let bestScore = -Infinity

  for (const mate of mates) {
    const { chance, dist, isThree } = evaluateShot(scene, mate)
    const open = nearestOpponentDistance(scene, mate)
    const role = inferRole(mate)
    const roleBonus =
      role === 'big' && dist < 12
        ? 6
        : role !== 'big' && isThree
          ? 8
          : 0
    const laneClear = pathIsClear(scene, handler, mate.position) ? 12 : -18
    const ahead =
      distanceToBasket(scene, mate) < distanceToBasket(scene, handler) - 2
        ? 10
        : 0
    const openThreeBonus =
      isThree && open >= 4.5
        ? 14 +
          (isCornerThree(scene, mate) ? 8 : 0) +
          effectiveRating(mate, mate.shooting) * 0.12
        : 0

    // Prefer open, skilled looks; reward advancing the ball up court
    const score =
      chance * 55 +
      open * 4.5 -
      dist * 0.45 +
      effectiveRating(mate, mate.shooting) * 0.08 +
      effectiveRating(mate, mate.finishing) * 0.05 +
      roleBonus +
      laneClear +
      ahead +
      openThreeBonus +
      Math.random() * 6

    if (score > bestScore) {
      bestScore = score
      best = mate
    }
  }

  return best
}

/**
 * Outlet / advance: teammate meaningfully closer to the rim with a clear
 * pass lane (and preferably space once they catch it).
 */
function pickAdvancePassTarget(
  scene: GameScene,
  handler: Player
): Player | undefined {
  const handlerDist = distanceToBasket(scene, handler)
  const mates = teammates(scene, handler)
  let best: Player | undefined
  let bestScore = -Infinity

  for (const mate of mates) {
    const mateDist = distanceToBasket(scene, mate)
    // Must be clearly further up the floor toward the hoop
    if (mateDist >= handlerDist - 3) continue
    if (!pathIsClear(scene, handler, mate.position, 2.8)) continue

    const passDist = distance(handler.position, mate.position)
    if (passDist < 4 || passDist > 38) continue

    const space = nearestOpponentDistance(scene, mate)
    const gain = handlerDist - mateDist
    const towardRimOpen = pathIsClear(scene, mate, basketPosition(scene.attackSide), 3.2)
      ? 14
      : 0

    const score =
      gain * 2.2 +
      space * 3.5 +
      towardRimOpen +
      handleSkill(mate) * 0.08 -
      passDist * 0.15 +
      Math.random() * 4

    if (score > bestScore) {
      bestScore = score
      best = mate
    }
  }

  return best
}

function scoreActions(scene: GameScene, handler: Player): ScoredAction[] {
  const { chance, dist, isThree } = evaluateShot(scene, handler)
  const open = nearestOpponentDistance(scene, handler)
  const basket = basketPosition(scene.attackSide)
  const toRim = distance(handler.position, basket)
  const clockPressure =
    scene.shotClock <= 5 ? 25 : scene.shotClock <= 8 ? 10 : 0
  const passCountPressure = scene.passesThisPossession >= 4 ? 20 : 0
  const role = inferRole(handler)

  const openThree =
    isThree && open >= 4.5
      ? 18 +
        (isCornerThree(scene, handler) ? 10 : 4) +
        effectiveRating(handler, handler.shooting) * 0.2 +
        (role !== 'big' ? 6 : -4)
      : 0

  const shootScore =
    chance * 70 +
    open * 3 +
    (isThree
      ? effectiveRating(handler, handler.shooting) * 0.22
      : effectiveRating(handler, handler.finishing) * 0.18) +
    (dist < 8 ? 12 : 0) +
    openThree +
    clockPressure +
    passCountPressure +
    Math.random() * 8

  const passTo = pickPassTarget(scene, handler)
  let passScore = -50
  if (passTo) {
    const look = evaluateShot(scene, passTo)
    const mateOpen = nearestOpponentDistance(scene, passTo)
    const kickThree =
      look.isThree && mateOpen >= 4.5
        ? 16 + (isCornerThree(scene, passTo) ? 8 : 0)
        : 0
    passScore =
      look.chance * 48 +
      mateOpen * 5 -
      distance(handler.position, passTo.position) * 0.25 +
      handleSkill(passTo) * 0.05 +
      (look.chance > chance + 0.08 ? 10 : 0) +
      (open < 2.8 ? 8 : 0) +
      kickThree +
      Math.random() * 7
  }

  const laneOpen = open > 3.2 || nearestLaneGap(scene, handler) > 2.8
  // Don't force drives when a real open three is available
  const driveScore =
    (role === 'big'
      ? effectiveRating(handler, handler.finishing) * 0.35
      : effectiveRating(handler, handler.finishing) * 0.2) +
    effectiveRating(handler, handler.speed) * 0.25 +
    (laneOpen ? 14 : -6) +
    (toRim > 10 && toRim < 26 ? 12 : 0) +
    (chance < 0.38 ? 8 : 0) -
    openThree * 0.55 -
    clockPressure * 0.4 +
    Math.random() * 6

  const holdScore =
    6 +
    (open < 2.5 ? 4 : 0) +
    (scene.passesThisPossession === 0 ? 5 : 0) -
    clockPressure -
    passCountPressure +
    Math.random() * 4

  const actions: ScoredAction[] = [
    { kind: 'shoot', score: shootScore },
    { kind: 'pass', score: passScore, passTo },
    { kind: 'drive', score: driveScore, driveTo: driveTarget(scene, handler) },
    { kind: 'hold', score: holdScore }
  ]

  // Late clock: never hold, rarely drive deep
  if (scene.shotClock <= 4) {
    for (const a of actions) {
      if (a.kind === 'hold') a.score -= 40
      if (a.kind === 'drive') a.score -= 15
      if (a.kind === 'shoot') a.score += 18
    }
  }

  return actions
}

function nearestLaneGap(scene: GameScene, handler: Player): number {
  const basket = basketPosition(scene.attackSide)
  const mid = {
    x: (handler.position.x + basket.x) / 2,
    y: (handler.position.y + basket.y) / 2
  }
  const foes = scene.players.filter((p) => p.team !== handler.team)
  if (foes.length === 0) return 99
  return Math.min(...foes.map((f) => distance(f.position, mid)))
}

/**
 * Utility AI: shoot / pass / drive / hold from ratings + spacing + clock.
 */
export function tryOffenseDecision(scene: GameScene): void {
  if (scene.phase !== 'live') return
  if (scene.ball.state !== 'held') return
  if (scene.timer > 0) return
  if (scene.gameClock <= 0) return

  const handler = getPossessor(scene)
  if (!handler) return

  // Push the ball up: pass ahead to a teammate closer to the rim with a clear lane
  const advanceTo = pickAdvancePassTarget(scene, handler)
  if (advanceTo && distanceToBasket(scene, handler) > 16) {
    startPass(scene, handler, advanceTo)
    return
  }

  const offense = scene.players.filter((p) => p.team === scene.possessionTeam)
  const offenseReady = offense.filter(playerHasArrived).length
  const canActEarly =
    scene.passesThisPossession > 0 || distanceToBasket(scene, handler) < 14

  if (!canActEarly && offenseReady < 3) return
  if (!playerHasArrived(handler) && distanceToBasket(scene, handler) > 12) {
    // Still allow a short advance pass while the handler is running up
    if (advanceTo) {
      startPass(scene, handler, advanceTo)
      return
    }
    return
  }

  // Open catch-and-shoot three: take it before forcing a drive
  {
    const look = evaluateShot(scene, handler)
    const space = nearestOpponentDistance(scene, handler)
    if (
      look.isThree &&
      space >= 4.5 &&
      handler.shooting >= 68 &&
      scene.shotClock > 3
    ) {
      startShot(scene, handler)
      return
    }
  }

  // Clear path to the rim: attack immediately (drive, or shoot if already close)
  if (laneIsOpen(scene, handler) && scene.shotClock > 4) {
    const toRim = distanceToBasket(scene, handler)
    if (toRim < 9) {
      startShot(scene, handler)
      return
    }
    // Prefer dumping ahead if someone is open further up
    if (advanceTo && distanceToBasket(scene, advanceTo) < toRim - 5) {
      startPass(scene, handler, advanceTo)
      return
    }
    handler.target = { ...driveTarget(scene, handler) }
    scene.timer = 0.05
    return
  }

  const actions = scoreActions(scene, handler).sort((a, b) => b.score - a.score)
  const best = actions[0]
  if (!best) return

  if (best.kind === 'shoot') {
    startShot(scene, handler)
    return
  }

  if (best.kind === 'pass' && best.passTo) {
    startPass(scene, handler, best.passTo)
    return
  }

  if (best.kind === 'drive' && best.driveTo) {
    handler.target = { ...best.driveTo }
    scene.timer = 0.05
    return
  }

  // Hold — short pause then re-evaluate
  scene.timer = 0.35 + Math.random() * 0.35
}
