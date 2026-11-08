import { basketPosition } from '../court'
import { distance, getPossessor } from '../entities'
import type { GameScene, Player, Vec2 } from '../types'
import { handleSkill, inferRole, type Role } from './roles'

type SpotKind =
  | 'top'
  | 'leftWing'
  | 'rightWing'
  | 'leftCorner'
  | 'rightCorner'
  | 'paint'

function spotMap(side: 'left' | 'right'): Record<SpotKind, Vec2> {
  const basket = basketPosition(side)
  const t = side === 'right' ? -1 : 1
  return {
    top: { x: basket.x + t * 22, y: 0 },
    leftWing: { x: basket.x + t * 19, y: -12 },
    rightWing: { x: basket.x + t * 19, y: 12 },
    leftCorner: { x: basket.x + t * 3.5, y: -22 },
    rightCorner: { x: basket.x + t * 3.5, y: 22 },
    paint: { x: basket.x + t * 7, y: 2 }
  }
}

/**
 * Assign role-aware half-court spots: best handler at top,
 * shooters to wings/corners, bigs to the paint.
 */
export function assignRoleSpacing(
  players: Player[],
  side: 'left' | 'right'
): void {
  const spots = spotMap(side)
  const ordered = [...players].sort((a, b) => handleSkill(b) - handleSkill(a))
  const used = new Set<string>()

  const take = (id: string, spot: Vec2): void => {
    const p = players.find((x) => x.id === id)
    if (!p || used.has(id)) return
    p.target = { ...spot }
    used.add(id)
  }

  const handler = ordered[0]
  if (handler) take(handler.id, spots.top)

  const remaining = players.filter((p) => !used.has(p.id))
  const bigs = remaining
    .filter((p) => inferRole(p) === 'big')
    .sort((a, b) => b.rebounding - a.rebounding)
  const shooters = remaining
    .filter((p) => !bigs.includes(p))
    .sort((a, b) => b.shooting - a.shooting)

  if (bigs[0]) take(bigs[0].id, spots.paint)

  const spaceOrder: SpotKind[] = [
    'leftCorner',
    'rightCorner',
    'leftWing',
    'rightWing',
    'paint'
  ]
  let si = 0
  for (const shooter of shooters) {
    if (spaceOrder[si] === 'paint' && bigs[0]) si += 1
    const kind = spaceOrder[si] ?? 'leftWing'
    take(shooter.id, spots[kind])
    si += 1
  }

  for (const player of players) {
    if (used.has(player.id)) continue
    const kind = spaceOrder[si] ?? 'rightWing'
    take(player.id, spots[kind])
    si += 1
  }
}

/**
 * Off-ball: keep role spacing without stomping the ball handler's drive target.
 */
export function updateOffensiveSpacing(scene: GameScene): void {
  if (scene.phase !== 'live') return
  if (scene.ball.state !== 'held' && scene.ball.state !== 'passing') return

  const offense = scene.players.filter((p) => p.team === scene.possessionTeam)
  const handler = getPossessor(scene)
  const savedHandlerTarget = handler ? { ...handler.target } : null
  const spots = spotMap(scene.attackSide)

  assignRoleSpacing(offense, scene.attackSide)

  if (handler && savedHandlerTarget) {
    handler.target = savedHandlerTarget
  }

  if (!handler) return

  const ballY = handler.position.y
  const basket = basketPosition(scene.attackSide)
  const collapsing = distance(handler.position, basket) < 16

  for (const player of offense) {
    if (player.id === handler.id) continue

    const role: Role = inferRole(player)

    if (collapsing && role !== 'big') {
      const weakSide =
        Math.sign(player.target.y) !== Math.sign(ballY) ||
        Math.abs(player.target.y) < 4
      if (weakSide) {
        player.target = {
          x: player.target.x,
          y: player.target.y + Math.sign(player.target.y || 1) * 1.5
        }
      }
    }

    if (role === 'wing' || role === 'guard') {
      const sameSide = Math.sign(player.position.y) === Math.sign(ballY)
      if (!sameSide && Math.abs(ballY) > 6) {
        player.target = {
          x: (player.target.x + spots.top.x) / 2,
          y: player.target.y * 0.85
        }
      }
    }
  }
}

/** Drive destination: attack the rim with a slight side offset. */
export function driveTarget(scene: GameScene, handler: Player): Vec2 {
  const basket = basketPosition(scene.attackSide)
  const dx = basket.x - handler.position.x
  const dy = basket.y - handler.position.y
  const len = Math.hypot(dx, dy) || 1
  const depth = Math.min(12, Math.max(5, len * 0.55))
  const sideBias = handler.number % 2 === 0 ? 1.8 : -1.8
  return {
    x: handler.position.x + (dx / len) * depth,
    y: handler.position.y + (dy / len) * depth * 0.35 + sideBias
  }
}
