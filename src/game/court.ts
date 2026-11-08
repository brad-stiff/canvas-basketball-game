import type { Vec2 } from './types'

export type { Vec2 }

/** NBA court dimensions in feet. Origin is center court; +x toward right basket. */
export const COURT = {
  length: 94,
  width: 50,
  basketFromBaseline: 5.25,
  laneWidth: 16,
  laneDepth: 19,
  freeThrowCircleRadius: 6,
  restrictedRadius: 4,
  threePointRadius: 23.75,
  threePointCornerOffset: 3,
  backboardWidth: 6,
  rimRadius: 0.75,
  rimFromBackboard: 0.5,
  centerCircleRadius: 6
} as const

export function basketPosition(side: 'left' | 'right'): Vec2 {
  const x =
    side === 'right'
      ? COURT.length / 2 - COURT.basketFromBaseline
      : -COURT.length / 2 + COURT.basketFromBaseline
  return { x, y: 0 }
}

export type CourtView = {
  /** Pixels per foot */
  scale: number
  /** Canvas pixel offset of court center */
  originX: number
  originY: number
  width: number
  height: number
}

/** Fit the full court in the canvas with padding. */
export function computeCourtView(
  canvasWidth: number,
  canvasHeight: number,
  paddingPx = 24
): CourtView {
  const usableW = Math.max(1, canvasWidth - paddingPx * 2)
  const usableH = Math.max(1, canvasHeight - paddingPx * 2)
  const scale = Math.min(usableW / COURT.length, usableH / COURT.width)
  return {
    scale,
    originX: canvasWidth / 2,
    originY: canvasHeight / 2,
    width: canvasWidth,
    height: canvasHeight
  }
}

export function worldToScreen(view: CourtView, point: Vec2): Vec2 {
  return {
    x: view.originX + point.x * view.scale,
    y: view.originY + point.y * view.scale
  }
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const a = worldToScreen(view, { x: x1, y: y1 })
  const b = worldToScreen(view, { x: x2, y: y2 })
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function strokeRect(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const topLeft = worldToScreen(view, { x, y })
  ctx.strokeRect(topLeft.x, topLeft.y, w * view.scale, h * view.scale)
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const topLeft = worldToScreen(view, { x, y })
  ctx.fillRect(topLeft.x, topLeft.y, w * view.scale, h * view.scale)
}

function strokeCircle(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  cx: number,
  cy: number,
  radius: number
): void {
  const c = worldToScreen(view, { x: cx, y: cy })
  ctx.beginPath()
  ctx.arc(c.x, c.y, radius * view.scale, 0, Math.PI * 2)
  ctx.stroke()
}

function drawThreePointLine(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  side: 'left' | 'right'
): void {
  const basket = basketPosition(side)
  const halfW = COURT.width / 2
  const cornerY = halfW - COURT.threePointCornerOffset
  const dx = Math.sqrt(
    Math.max(0, COURT.threePointRadius ** 2 - cornerY ** 2)
  )
  const sign = side === 'right' ? 1 : -1
  // Arc meets the corner wings toward midcourt from the basket
  const cornerX = basket.x - sign * dx
  const baselineX = sign * (COURT.length / 2)

  strokeLine(ctx, view, baselineX, cornerY, cornerX, cornerY)
  strokeLine(ctx, view, baselineX, -cornerY, cornerX, -cornerY)

  // Sweep through midcourt (not the baseline). Right basket needs the
  // counterclockwise sweep; left basket uses the default clockwise sweep.
  const startAngle = Math.atan2(-cornerY, -sign * dx)
  const endAngle = Math.atan2(cornerY, -sign * dx)
  const c = worldToScreen(view, basket)
  ctx.beginPath()
  ctx.arc(
    c.x,
    c.y,
    COURT.threePointRadius * view.scale,
    startAngle,
    endAngle,
    side === 'right'
  )
  ctx.stroke()
}

function drawBasket(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  side: 'left' | 'right'
): void {
  const basket = basketPosition(side)
  const sign = side === 'right' ? 1 : -1
  const backboardX = basket.x + sign * COURT.rimFromBackboard

  // Backboard
  strokeLine(
    ctx,
    view,
    backboardX,
    -COURT.backboardWidth / 2,
    backboardX,
    COURT.backboardWidth / 2
  )

  // Rim
  const rim = worldToScreen(view, basket)
  ctx.beginPath()
  ctx.arc(rim.x, rim.y, COURT.rimRadius * view.scale, 0, Math.PI * 2)
  ctx.strokeStyle = '#c45c26'
  ctx.lineWidth = Math.max(1.5, view.scale * 0.12)
  ctx.stroke()
  ctx.strokeStyle = '#f2f5f0'
  ctx.lineWidth = Math.max(1, view.scale * 0.08)
}

function drawLane(
  ctx: CanvasRenderingContext2D,
  view: CourtView,
  side: 'left' | 'right'
): void {
  const halfLen = COURT.length / 2
  const halfLane = COURT.laneWidth / 2
  const laneX = side === 'right' ? halfLen - COURT.laneDepth : -halfLen

  strokeRect(ctx, view, laneX, -halfLane, COURT.laneDepth, COURT.laneWidth)

  const ftLineX =
    side === 'right' ? halfLen - COURT.laneDepth : -halfLen + COURT.laneDepth
  strokeCircle(ctx, view, ftLineX, 0, COURT.freeThrowCircleRadius)

  // Restricted-area semicircle opens into the lane (toward midcourt).
  const basket = basketPosition(side)
  const c = worldToScreen(view, basket)
  const startAngle = side === 'right' ? Math.PI / 2 : -Math.PI / 2
  const endAngle = side === 'right' ? -Math.PI / 2 : Math.PI / 2
  ctx.beginPath()
  ctx.arc(c.x, c.y, COURT.restrictedRadius * view.scale, startAngle, endAngle)
  ctx.stroke()
}

export function drawCourt(ctx: CanvasRenderingContext2D, view: CourtView): void {
  const halfL = COURT.length / 2
  const halfW = COURT.width / 2

  ctx.clearRect(0, 0, view.width, view.height)

  // Floor
  ctx.fillStyle = '#2f4a32'
  fillRect(ctx, view, -halfL, -halfW, COURT.length, COURT.width)

  // Paint fill (lighter)
  ctx.fillStyle = '#3a5c3e'
  const halfLane = COURT.laneWidth / 2
  fillRect(ctx, view, halfL - COURT.laneDepth, -halfLane, COURT.laneDepth, COURT.laneWidth)
  fillRect(ctx, view, -halfL, -halfLane, COURT.laneDepth, COURT.laneWidth)

  ctx.strokeStyle = '#f2f5f0'
  ctx.lineWidth = Math.max(1.5, view.scale * 0.1)
  ctx.lineJoin = 'round'

  // Boundary
  strokeRect(ctx, view, -halfL, -halfW, COURT.length, COURT.width)

  // Half-court line
  strokeLine(ctx, view, 0, -halfW, 0, halfW)
  strokeCircle(ctx, view, 0, 0, COURT.centerCircleRadius)

  drawLane(ctx, view, 'left')
  drawLane(ctx, view, 'right')

  drawThreePointLine(ctx, view, 'left')
  drawThreePointLine(ctx, view, 'right')

  drawBasket(ctx, view, 'left')
  drawBasket(ctx, view, 'right')
}
