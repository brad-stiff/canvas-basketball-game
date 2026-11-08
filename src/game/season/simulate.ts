import { createInitialScene, type MatchupLineups } from '../entities'
import { FIXED_DT } from '../sim/loop'
import { stepScene } from '../sim/step'
import { resultFromScene } from './boxScore'
import type { GameResult } from './types'

/**
 * Run the full game engine without rendering until FINAL.
 * Uses fastSim to collapse dead-ball pauses.
 */
export function simulateGame(
  matchup: MatchupLineups,
  userTeamId: string
): GameResult {
  const scene = createInitialScene(matchup, { fastSim: true })
  const maxSteps = 60 * 60 * 30 // ~30 minutes of sim time safety
  let steps = 0

  while (scene.phase !== 'final' && steps < maxSteps) {
    stepScene(scene, FIXED_DT)
    steps += 1
  }

  return resultFromScene(scene, matchup, userTeamId)
}
