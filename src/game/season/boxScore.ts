import type { MatchupLineups } from '../entities'
import type { GameScene, Player, TeamId } from '../types'
import type { BoxScore, GameResult, PlayerBoxLine } from './types'

export function emptyLine(player: Player): PlayerBoxLine {
  return {
    playerId: player.id,
    name: player.name,
    number: player.number,
    minutes: 0,
    points: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    fouls: 0,
    plusMinus: 0
  }
}

export function initBoxScore(scene: GameScene): BoxScore {
  return {
    home: scene.players.filter((p) => p.team === 'home').map(emptyLine),
    away: scene.players.filter((p) => p.team === 'away').map(emptyLine)
  }
}

function lineFor(
  scene: GameScene,
  team: TeamId,
  playerId: string
): PlayerBoxLine | undefined {
  return scene.boxScore[team].find((l) => l.playerId === playerId)
}

/** Ensure a box line exists for a player who just entered the game. */
export function ensureBoxLine(
  scene: GameScene,
  team: TeamId,
  player: Player
): PlayerBoxLine {
  const existing = lineFor(scene, team, player.id)
  if (existing) return existing
  const line = emptyLine(player)
  scene.boxScore[team].push(line)
  return line
}

/** Apply score differential to every player currently on the floor. */
export function applyPlusMinus(scene: GameScene, scoringTeam: TeamId, pts: number): void {
  for (const player of scene.players) {
    const line = lineFor(scene, player.team, player.id)
    if (!line) continue
    line.plusMinus += player.team === scoringTeam ? pts : -pts
  }
}

export function recordFieldGoalAttempt(
  scene: GameScene,
  shooterId: string,
  team: TeamId,
  isThree: boolean,
  made: boolean
): void {
  const line = lineFor(scene, team, shooterId)
  if (!line) return
  line.fga += 1
  if (isThree) line.tpa += 1
  if (made) {
    line.fgm += 1
    if (isThree) line.tpm += 1
    line.points += isThree ? 3 : 2
  }
}

export function recordFreeThrow(
  scene: GameScene,
  shooterId: string,
  team: TeamId,
  made: boolean
): void {
  const line = lineFor(scene, team, shooterId)
  if (!line) return
  line.fta += 1
  if (made) {
    line.ftm += 1
    line.points += 1
  }
}

function bumpStat(
  scene: GameScene,
  team: TeamId,
  playerId: string,
  key: 'rebounds' | 'assists' | 'steals' | 'blocks' | 'fouls'
): void {
  const line = lineFor(scene, team, playerId)
  if (!line) return
  line[key] += 1
}

export function recordRebound(
  scene: GameScene,
  playerId: string,
  team: TeamId
): void {
  bumpStat(scene, team, playerId, 'rebounds')
}

export function recordAssist(
  scene: GameScene,
  playerId: string,
  team: TeamId
): void {
  bumpStat(scene, team, playerId, 'assists')
}

/** Credit an assist when a teammate's pass set up this made FG. */
export function maybeRecordAssist(
  scene: GameScene,
  shooterId: string,
  team: TeamId
): void {
  const passerId = scene.lastPasserId
  if (!passerId || passerId === shooterId) return
  recordAssist(scene, passerId, team)
}

export function recordSteal(
  scene: GameScene,
  playerId: string,
  team: TeamId
): void {
  bumpStat(scene, team, playerId, 'steals')
}

export function recordBlock(
  scene: GameScene,
  playerId: string,
  team: TeamId
): void {
  bumpStat(scene, team, playerId, 'blocks')
}

export function recordPersonalFoul(
  scene: GameScene,
  playerId: string,
  team: TeamId
): void {
  bumpStat(scene, team, playerId, 'fouls')
}

export function resultFromScene(
  scene: GameScene,
  matchup: MatchupLineups,
  userTeamId: string
): GameResult {
  return {
    homeTeamId: matchup.home.id,
    awayTeamId: matchup.away.id,
    homeScore: scene.score.home,
    awayScore: scene.score.away,
    homeName: matchup.home.name,
    awayName: matchup.away.name,
    homeAbbrev: matchup.home.abbrev,
    awayAbbrev: matchup.away.abbrev,
    box: {
      home: scene.boxScore.home.map((l) => ({ ...l })),
      away: scene.boxScore.away.map((l) => ({ ...l }))
    },
    userIsHome: matchup.home.id === userTeamId
  }
}
