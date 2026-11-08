import { basketPosition } from './court'
import { startersOf } from './roster/generate'
import type { RosterPlayer, TeamRoster } from './roster/types'
import { ensureBoxLine, initBoxScore } from './season/boxScore'
import { assignRoleSpacing } from './sim/spacing'
import { getBenchEnergy, setBenchEnergy } from './sim/stamina'
import type { Ball, GameScene, Player, TeamId, Vec2 } from './types'

export type { Ball, GameScene, Player, TeamId, Vec2 }

export const TEAM_COLORS: Record<TeamId, string> = {
  home: '#1f4b99',
  away: '#b22222'
}

export const PLAYER_RADIUS_FT = 1.35
export const BALL_RADIUS_FT = 0.55

/** Home always attacks right; away always attacks left. */
export function attackSideFor(team: TeamId): 'left' | 'right' {
  return team === 'home' ? 'right' : 'left'
}

export function otherTeam(team: TeamId): TeamId {
  return team === 'home' ? 'away' : 'home'
}

export function offensiveSpots(side: 'left' | 'right'): Vec2[] {
  const basket = basketPosition(side)
  const towardCenter = side === 'right' ? -1 : 1
  return [
    { x: basket.x + towardCenter * 22, y: 0 },
    { x: basket.x + towardCenter * 18, y: -14 },
    { x: basket.x + towardCenter * 18, y: 14 },
    { x: basket.x + towardCenter * 8, y: -6 },
    { x: basket.x + towardCenter * 6, y: 4 }
  ]
}

export function defensiveSpots(
  offense: Vec2[],
  side: 'left' | 'right'
): Vec2[] {
  const basket = basketPosition(side)
  return offense.map((spot, i) => {
    const towardBasket = {
      x: basket.x - spot.x,
      y: basket.y - spot.y
    }
    const len = Math.hypot(towardBasket.x, towardBasket.y) || 1
    const shade = 3.2
    return {
      x: spot.x + (towardBasket.x / len) * shade,
      y: spot.y + (towardBasket.y / len) * shade + (i === 0 ? 0.8 : 0)
    }
  })
}

function tipOffPositions(): { home: Vec2[]; away: Vec2[] } {
  return {
    home: [
      { x: -2.5, y: 0 },
      { x: -8, y: -10 },
      { x: -8, y: 10 },
      { x: -16, y: -4 },
      { x: -16, y: 5 }
    ],
    away: [
      { x: 2.5, y: 0.6 },
      { x: 8, y: -10 },
      { x: 8, y: 10 },
      { x: 16, y: -4 },
      { x: 16, y: 5 }
    ]
  }
}

function rosterToGamePlayer(
  roster: RosterPlayer,
  team: TeamId,
  start: Vec2,
  energy = 100
): Player {
  return {
    id: roster.id,
    team,
    name: roster.name,
    number: roster.number,
    pos: roster.pos,
    position: { ...start },
    target: { ...start },
    speed: roster.speed,
    shooting: roster.shooting,
    finishing: roster.finishing,
    rebounding: roster.rebounding,
    defense: roster.defense,
    stamina: roster.stamina,
    energy
  }
}

function lineupToPlayers(
  teamRoster: TeamRoster,
  side: TeamId,
  starts: Vec2[]
): Player[] {
  const starters = startersOf(teamRoster).slice(0, 5)
  return starts.map((start, i) => {
    const roster = starters[i]
    if (!roster) {
      return rosterToGamePlayer(
        {
          id: `${side}-fill-${i}`,
          name: 'Walk On',
          number: i + 1,
          pos: 'SF',
          speed: 60,
          shooting: 60,
          finishing: 60,
          rebounding: 60,
          defense: 60,
          stamina: 60
        },
        side,
        start
      )
    }
    return rosterToGamePlayer(roster, side, start)
  })
}

export function heldBallOffset(owner: Player): Vec2 {
  return {
    x: owner.position.x + 0.85,
    y: owner.position.y - 0.55
  }
}

export function createHeldBall(owner: Player): Ball {
  return {
    state: 'held',
    possessorId: owner.id,
    position: heldBallOffset(owner),
    flightT: 0,
    flightDuration: 0,
    from: { ...heldBallOffset(owner) },
    to: { ...heldBallOffset(owner) },
    shotMakes: false,
    shotIsThree: false,
    arcHeight: 0,
    velocity: { x: 0, y: 0 },
    shootingFoul: false,
    shooterId: null,
    passReceiverId: null
  }
}

/** Align offense spots; seed defense between each man and the hoop. */
export function assignTeamTargets(scene: GameScene): void {
  const side = scene.attackSide
  const basket = basketPosition(side)
  const offenseTeam = scene.players.filter((p) => p.team === scene.possessionTeam)
  const defenseTeam = scene.players.filter((p) => p.team !== scene.possessionTeam)

  assignRoleSpacing(offenseTeam, side)

  // Follow current positions (not destination spots) so D doesn't beat O up the floor
  offenseTeam.forEach((man, i) => {
    const defender = defenseTeam[i]
    if (!defender) return
    const dx = basket.x - man.position.x
    const dy = basket.y - man.position.y
    const len = Math.hypot(dx, dy) || 1
    const shade = Math.min(4.5, Math.max(2.2, len * 0.12))
    defender.target = {
      x: man.position.x + (dx / len) * shade,
      y: man.position.y + (dy / len) * shade
    }
  })
}

export type MatchupLineups = {
  home: TeamRoster
  away: TeamRoster
}

/** Build a tip-off scene from two team lineups (starters only on court). */
export function createInitialScene(
  matchup: MatchupLineups,
  options?: { fastSim?: boolean; userManagedTeam?: TeamId | null }
): GameScene {
  const tip = tipOffPositions()
  const homePlayers = lineupToPlayers(matchup.home, 'home', tip.home)
  const awayPlayers = lineupToPlayers(matchup.away, 'away', tip.away)
  const pointGuard = homePlayers[0]!
  const fastSim = options?.fastSim ?? false
  const onCourtIds = new Set(
    [...homePlayers, ...awayPlayers].map((p) => p.id)
  )
  const benchEnergy: Record<string, number> = {}
  for (const side of [matchup.home, matchup.away]) {
    for (const player of side.players) {
      if (!onCourtIds.has(player.id)) {
        benchEnergy[player.id] = 100
      }
    }
  }

  const scene: GameScene = {
    players: [...homePlayers, ...awayPlayers],
    ball: {
      ...createHeldBall(pointGuard),
      possessorId: null,
      position: { x: 0, y: 0 }
    },
    possessionTeam: 'home',
    attackSide: 'right',
    score: { home: 0, away: 0 },
    phase: 'tipoff',
    timer: fastSim ? 0.05 : 1.6,
    passesThisPossession: 0,
    shotClock: 24,
    shotClockRunning: false,
    callout: 'JUMP BALL',
    calloutTimer: fastSim ? 0.05 : 1.6,
    quarter: 1,
    gameClock: 120,
    gameClockRunning: false,
    teamFouls: { home: 0, away: 0 },
    freeThrows: null,
    nextPeriodPossession: 'away',
    teamNames: { home: matchup.home.name, away: matchup.away.name },
    teamAbbrevs: { home: matchup.home.abbrev, away: matchup.away.abbrev },
    teamColors: { home: matchup.home.color, away: matchup.away.color },
    teamIds: { home: matchup.home.id, away: matchup.away.id },
    boxScore: { home: [], away: [] },
    timeoutsLeft: { home: 2, away: 2 },
    fastSim,
    rosters: { home: matchup.home, away: matchup.away },
    benchEnergy,
    userManagedTeam: options?.userManagedTeam ?? null,
    userLineupHoldSeconds: 0
  }
  scene.boxScore = initBoxScore(scene)
  return scene
}

/** Swap an on-court player with a bench roster player (same team). */
export function substitutePlayer(
  scene: GameScene,
  outPlayerId: string,
  incoming: RosterPlayer
): boolean {
  const outgoing = getPlayer(scene, outPlayerId)
  if (!outgoing) return false
  if (scene.players.some((p) => p.id === incoming.id)) return false

  setBenchEnergy(scene, outgoing.id, outgoing.energy)
  const incomingEnergy = getBenchEnergy(scene, incoming.id)

  const hadBall = scene.ball.possessorId === outgoing.id
  const replacement = rosterToGamePlayer(
    incoming,
    outgoing.team,
    { ...outgoing.position },
    incomingEnergy
  )
  replacement.target = { ...outgoing.target }

  const idx = scene.players.findIndex((p) => p.id === outPlayerId)
  if (idx < 0) return false
  scene.players[idx] = replacement
  delete scene.benchEnergy[incoming.id]

  ensureBoxLine(scene, outgoing.team, replacement)

  if (hadBall) {
    scene.ball = createHeldBall(replacement)
  } else if (scene.ball.passReceiverId === outPlayerId) {
    scene.ball.passReceiverId = replacement.id
  } else if (scene.ball.shooterId === outPlayerId) {
    scene.ball.shooterId = replacement.id
  }

  assignTeamTargets(scene)
  return true
}

export function getPlayer(scene: GameScene, id: string): Player | undefined {
  return scene.players.find((p) => p.id === id)
}

export function getPossessor(scene: GameScene): Player | undefined {
  if (!scene.ball.possessorId) return undefined
  return getPlayer(scene, scene.ball.possessorId)
}

export function teammates(scene: GameScene, player: Player): Player[] {
  return scene.players.filter((p) => p.team === player.team && p.id !== player.id)
}

export function opponents(scene: GameScene, player: Player): Player[] {
  return scene.players.filter((p) => p.team !== player.team)
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Ball world position (floor plane). Visual arc is applied at draw time. */
export function ballWorldPosition(scene: GameScene): Vec2 {
  if (scene.ball.state === 'held') {
    const owner = getPossessor(scene)
    if (owner) return heldBallOffset(owner)
  }
  return scene.ball.position
}

/** Give possession to a player and mark their team on offense. */
export function givePossession(scene: GameScene, player: Player): void {
  scene.possessionTeam = player.team
  scene.attackSide = attackSideFor(player.team)
  scene.ball = createHeldBall(player)
  scene.passesThisPossession = 0
  scene.shotClock = 24
  scene.shotClockRunning = true
  assignTeamTargets(scene)
}
