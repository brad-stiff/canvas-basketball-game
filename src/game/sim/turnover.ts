import {
  assignTeamTargets,
  attackSideFor,
  createHeldBall,
  otherTeam
} from '../entities'
import type { GameScene, Player, TeamId } from '../types'

export function showCallout(scene: GameScene, text: string, seconds = 1.2): void {
  scene.callout = text
  scene.calloutTimer = seconds
}

/** Give the ball to a specific player (steal / deflection recovery). */
export function turnoverToPlayer(
  scene: GameScene,
  player: Player,
  callout: string
): void {
  scene.possessionTeam = player.team
  scene.attackSide = attackSideFor(player.team)
  scene.ball = createHeldBall(player)
  scene.passesThisPossession = 0
  scene.phase = 'live'
  scene.timer = 0.55
  scene.shotClock = 24
  scene.shotClockRunning = true
  scene.gameClockRunning = true
  assignTeamTargets(scene)
  showCallout(scene, callout)
}

/** Shot-clock / OOB style turnover — a player on the other team gets it. */
export function turnoverToTeam(
  scene: GameScene,
  team: TeamId,
  callout: string
): void {
  const receiver =
    scene.players.find((p) => p.team === team && p.number === 1) ??
    scene.players.find((p) => p.team === team)

  if (!receiver) return
  turnoverToPlayer(scene, receiver, callout)
}

export function defensiveTeam(scene: GameScene): TeamId {
  return otherTeam(scene.possessionTeam)
}
