import { substitutePlayer } from '../entities'
import { overallRating } from '../roster/ratings'
import type { RosterPlayer } from '../roster/types'
import type { CourtPos, GameScene, Player, TeamId } from '../types'
import { getBenchEnergy } from './stamina'

const USER_HOLD_SECONDS = 45
const MAX_SUBS_PER_TEAM = 2
/** Energy gap the bench must beat the outgoing player by. */
const MIN_ENERGY_EDGE = 12

const POS_COMPAT: Record<CourtPos, CourtPos[]> = {
  PG: ['PG', 'SG'],
  SG: ['SG', 'PG', 'SF'],
  SF: ['SF', 'SG', 'PF'],
  PF: ['PF', 'SF', 'C'],
  C: ['C', 'PF']
}

function scoreMargin(scene: GameScene): number {
  return Math.abs(scene.score.home - scene.score.away)
}

function isLateAndClose(scene: GameScene): boolean {
  return scene.quarter >= 4 && scoreMargin(scene) <= 8
}

function energyThreshold(scene: GameScene, force: boolean): number {
  if (force) return 62
  if (isLateAndClose(scene)) return 28
  return 48
}

function criticalThreshold(scene: GameScene): number {
  return isLateAndClose(scene) ? 12 : 20
}

function posFit(needed: CourtPos, candidate: CourtPos): number {
  const list = POS_COMPAT[needed]
  const idx = list.indexOf(candidate)
  if (idx < 0) return -1
  return list.length - idx
}

function rosterOvr(p: RosterPlayer): number {
  return overallRating(p)
}

function playerAsRoster(p: Player): RosterPlayer {
  return {
    id: p.id,
    name: p.name,
    number: p.number,
    pos: p.pos,
    speed: p.speed,
    shooting: p.shooting,
    finishing: p.finishing,
    rebounding: p.rebounding,
    defense: p.defense,
    stamina: p.stamina
  }
}

/** After a user timeout, briefly protect their lineup from AI undos. */
export function setUserLineupHold(scene: GameScene): void {
  if (!scene.userManagedTeam) return
  scene.userLineupHoldSeconds = USER_HOLD_SECONDS
}

export function clearUserLineupHold(scene: GameScene): void {
  scene.userLineupHoldSeconds = 0
}

function shouldSkipTeam(scene: GameScene, team: TeamId): boolean {
  if (scene.userManagedTeam !== team) return false
  if (scene.userLineupHoldSeconds <= 0) return false
  // Still allow rescue subs when someone is critically gassed
  return true
}

function benchPlayers(scene: GameScene, team: TeamId): RosterPlayer[] {
  const onCourt = new Set(
    scene.players.filter((p) => p.team === team).map((p) => p.id)
  )
  return scene.rosters[team].players.filter((p) => !onCourt.has(p.id))
}

function pickIncoming(
  scene: GameScene,
  outgoing: Player,
  bench: RosterPlayer[],
  usedBench: Set<string>
): RosterPlayer | null {
  let best: RosterPlayer | null = null
  let bestScore = -Infinity
  const outEnergy = outgoing.energy

  for (const candidate of bench) {
    if (usedBench.has(candidate.id)) continue
    const fit = posFit(outgoing.pos, candidate.pos)
    if (fit < 0) continue
    const energy = getBenchEnergy(scene, candidate.id)
    if (energy < outEnergy + MIN_ENERGY_EDGE) continue

    // Prefer fresh + position fit; slightly prefer higher OVR when close
    const score =
      energy * 1.2 +
      fit * 18 +
      rosterOvr(candidate) * 0.15 -
      outEnergy * 0.4

    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}

function coachTeam(
  scene: GameScene,
  team: TeamId,
  force: boolean,
  protectedIds: Set<string>
): number {
  const hold = shouldSkipTeam(scene, team)
  const threshold = energyThreshold(scene, force)
  const critical = criticalThreshold(scene)
  const onCourt = scene.players.filter((p) => p.team === team)
  const bench = benchPlayers(scene, team)
  if (bench.length === 0) return 0

  const tired = [...onCourt]
    .filter((p) => {
      if (protectedIds.has(p.id)) return false
      if (p.energy >= threshold) return false
      if (hold && p.energy > critical) return false
      return true
    })
    .sort((a, b) => {
      // Rest lower-OVR tired players first; keep stars longer
      const ovrDelta = rosterOvr(playerAsRoster(a)) - rosterOvr(playerAsRoster(b))
      if (Math.abs(ovrDelta) > 4) return ovrDelta
      return a.energy - b.energy
    })

  const usedBench = new Set<string>()
  let subs = 0

  for (const outgoing of tired) {
    if (subs >= MAX_SUBS_PER_TEAM) break
    const incoming = pickIncoming(scene, outgoing, bench, usedBench)
    if (!incoming) continue
    if (substitutePlayer(scene, outgoing.id, incoming)) {
      usedBench.add(incoming.id)
      subs += 1
    }
  }

  return subs
}

/**
 * AI rotation at dead balls / breaks / timeouts.
 * Caps swaps per team so lineups do not thrash every whistle.
 */
export function tryCoachSubs(
  scene: GameScene,
  opts?: {
    teams?: TeamId[]
    force?: boolean
    /** Do not sub these players (e.g. FT shooter, inbounder). */
    protectIds?: string[]
  }
): void {
  if (scene.phase === 'final') return
  const teams = opts?.teams ?? (['home', 'away'] as TeamId[])
  const force = opts?.force ?? false
  const protectedIds = new Set(opts?.protectIds ?? [])
  for (const team of teams) {
    coachTeam(scene, team, force, protectedIds)
  }
}
