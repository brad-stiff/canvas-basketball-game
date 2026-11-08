import type { GameScene, Player } from '../types'

/** Base energy lost per second of live game clock while on the floor. */
const ON_COURT_DRAIN = 0.35
/** Bench recovery per real-time second. */
const BENCH_RECOVER = 0.55
/** Mild recovery for everyone during period breaks. */
const BREAK_RECOVER = 0.3

/** Higher stamina → slower drain (and slightly faster recovery). */
function staminaFactor(stamina: number): number {
  const s = Math.min(100, Math.max(0, stamina))
  return 1.25 - s / 100
}

function recoverFactor(stamina: number): number {
  const s = Math.min(100, Math.max(0, stamina))
  return 0.75 + s / 200
}

/**
 * Map a base rating through current energy.
 * Fully fresh ≈ base; fully gassed ≈ 55% of base.
 */
export function effectiveRating(player: Player, base: number): number {
  const energy = Math.min(100, Math.max(0, player.energy))
  return base * (0.55 + 0.45 * (energy / 100))
}

export function getBenchEnergy(scene: GameScene, playerId: string): number {
  return scene.benchEnergy[playerId] ?? 100
}

export function setBenchEnergy(
  scene: GameScene,
  playerId: string,
  energy: number
): void {
  scene.benchEnergy[playerId] = Math.min(100, Math.max(0, energy))
}

/** Drain on-court players while the clock runs; recover the bench / break. */
export function stepEnergy(scene: GameScene, dt: number): void {
  if (scene.phase === 'final') return

  if (scene.userLineupHoldSeconds > 0 && scene.gameClockRunning) {
    scene.userLineupHoldSeconds = Math.max(
      0,
      scene.userLineupHoldSeconds - dt
    )
  }

  const onCourtIds = new Set(scene.players.map((p) => p.id))

  if (scene.gameClockRunning && scene.phase === 'live') {
    for (const player of scene.players) {
      const drain = ON_COURT_DRAIN * staminaFactor(player.stamina) * dt
      player.energy = Math.max(0, player.energy - drain)
    }
  }

  if (scene.phase === 'break') {
    for (const player of scene.players) {
      const gain = BREAK_RECOVER * recoverFactor(player.stamina) * dt
      player.energy = Math.min(100, player.energy + gain)
    }
  }

  for (const side of ['home', 'away'] as const) {
    for (const roster of scene.rosters[side].players) {
      if (onCourtIds.has(roster.id)) continue
      const rate =
        scene.phase === 'break'
          ? BREAK_RECOVER
          : BENCH_RECOVER
      const current = getBenchEnergy(scene, roster.id)
      setBenchEnergy(
        scene,
        roster.id,
        current + rate * recoverFactor(roster.stamina) * dt
      )
    }
  }
}
