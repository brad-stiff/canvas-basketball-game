import {
  computeCourtView,
  drawCourt,
  worldToScreen,
  type CourtView
} from './court'
import { BALL_RADIUS_FT, PLAYER_RADIUS_FT, ballWorldPosition } from './entities'
import { formatGameClock, periodLabel } from './sim/clock'
import type { GameScene } from './types'

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  scene: GameScene
): void {
  for (const player of scene.players) {
    const screen = worldToScreen(view, player.position)
    const radius = PLAYER_RADIUS_FT * view.scale

    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = scene.teamColors[player.team]
    ctx.fill()
    ctx.lineWidth = Math.max(1, view.scale * 0.1)
    ctx.strokeStyle = '#0b0f0c'
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(10, view.scale * 1.1)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(player.number), screen.x, screen.y)
  }
}

function ballArcLift(scene: GameScene): number {
  const ball = scene.ball
  if (
    ball.state !== 'passing' &&
    ball.state !== 'shooting' &&
    ball.state !== 'freethrow'
  ) {
    return 0
  }
  const t = Math.min(1, Math.max(0, ball.flightT))
  return Math.sin(Math.PI * t) * ball.arcHeight
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  scene: GameScene
): void {
  const pos = ballWorldPosition(scene)
  const screen = worldToScreen(view, pos)
  const lift = ballArcLift(scene) * view.scale
  const radius = BALL_RADIUS_FT * view.scale

  ctx.beginPath()
  ctx.arc(screen.x, screen.y - lift, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#e87722'
  ctx.fill()
  ctx.lineWidth = Math.max(1, view.scale * 0.08)
  ctx.strokeStyle = '#5a2e0c'
  ctx.stroke()
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scene: GameScene
): void {
  const shot = Math.ceil(scene.shotClock)
  const shotColor = shot <= 5 ? '#f0c14a' : '#f2f5f0'
  const period = periodLabel(scene)
  const clock = formatGameClock(scene.gameClock)
  const home = scene.teamAbbrevs.home
  const away = scene.teamAbbrevs.away

  ctx.fillStyle = 'rgba(8, 12, 8, 0.62)'
  ctx.fillRect(canvasWidth / 2 - 220, 10, 440, 52)

  ctx.fillStyle = '#f2f5f0'
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    `${scene.score.home}  ${home}   ${period}   ${away}  ${scene.score.away}`,
    canvasWidth / 2,
    26
  )

  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(clock, canvasWidth / 2 - 70, 46)

  ctx.fillStyle = shotColor
  ctx.fillText(`SHOT ${shot}`, canvasWidth / 2 + 70, 46)

  ctx.fillStyle = 'rgba(242, 245, 240, 0.75)'
  ctx.font = '12px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(
    `FOULS  ${home}${scene.teamFouls.home}  ${away}${scene.teamFouls.away}`,
    canvasWidth / 2,
    70
  )

  if (scene.callout) {
    ctx.fillStyle = 'rgba(8, 12, 8, 0.7)'
    ctx.fillRect(canvasWidth / 2 - 160, 84, 320, 34)
    ctx.fillStyle = '#f0c14a'
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(scene.callout, canvasWidth / 2, 101)
  }

  if (scene.phase === 'final') {
    ctx.fillStyle = 'rgba(8, 12, 8, 0.55)'
    ctx.fillRect(0, canvasHeight / 2 - 40, canvasWidth, 80)
    ctx.fillStyle = '#f2f5f0'
    ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(
      `FINAL  ${scene.score.home} — ${scene.score.away}`,
      canvasWidth / 2,
      canvasHeight / 2
    )
  }
}

export function paintScene(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scene: GameScene
): void {
  const view = computeCourtView(canvasWidth, canvasHeight)
  drawCourt(ctx, view)
  drawPlayers(ctx, view, scene)
  drawBall(ctx, view, scene)
  drawHud(ctx, canvasWidth, canvasHeight, scene)
}
