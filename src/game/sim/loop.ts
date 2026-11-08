/** Fixed sim timestep (seconds). Render stays unlocked to display refresh. */
export const FIXED_DT = 1 / 60

const MAX_FRAME_DT = 0.05

export type LoopControls = {
  /** Playback multiplier: 1, 2, or 4 */
  speed: number
  paused: boolean
}

export type GameLoopHandlers = {
  step: (dt: number) => void
  render: () => void
  /** Mutable controls read each frame */
  controls: LoopControls
}

/**
 * requestAnimationFrame loop with a fixed timestep accumulator.
 * Speed multiplies how much sim time advances per wall-clock second.
 * Returns a dispose function that cancels the loop.
 */
export function startGameLoop(handlers: GameLoopHandlers): () => void {
  let frameId = 0
  let disposed = false
  let lastTime = performance.now()
  let accumulator = 0

  const tick = (now: number): void => {
    if (disposed) return

    const frameDt = Math.min(MAX_FRAME_DT, (now - lastTime) / 1000)
    lastTime = now

    const { speed, paused } = handlers.controls
    if (!paused) {
      const scaled = frameDt * Math.max(0, speed)
      const maxAccum = FIXED_DT * 5 * Math.max(1, speed)
      accumulator = Math.min(maxAccum, accumulator + scaled)

      while (accumulator >= FIXED_DT) {
        handlers.step(FIXED_DT)
        accumulator -= FIXED_DT
      }
    }

    handlers.render()
    frameId = requestAnimationFrame(tick)
  }

  frameId = requestAnimationFrame(tick)

  return () => {
    disposed = true
    cancelAnimationFrame(frameId)
  }
}
