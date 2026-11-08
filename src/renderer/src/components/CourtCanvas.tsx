import { useEffect, useRef, useState } from 'react'
import {
  createInitialScene,
  substitutePlayer,
  type MatchupLineups
} from '@game/entities'
import { paintScene } from '@game/drawScene'
import type { RosterPlayer } from '@game/roster/types'
import { resultFromScene } from '@game/season/boxScore'
import type { GameResult, PlayerBoxLine } from '@game/season/types'
import { startGameLoop, type LoopControls } from '@game/sim/loop'
import { stepScene } from '@game/sim/step'
import { setUserLineupHold, tryCoachSubs } from '@game/sim/coach'
import {
  callTimeout,
  canCallTimeout,
  resumeAfterTimeout
} from '@game/sim/timeout'
import type { GameScene, Player, TeamId } from '@game/types'
import { otherTeam } from '@game/entities'
import { showCallout } from '@game/sim/turnover'
import BoxScoreTable from './BoxScoreTable'
import TimeoutOverlay from './TimeoutOverlay'

type Props = {
  matchup: MatchupLineups
  userTeamId: string
  onComplete: (result: GameResult) => void
  onExit?: () => void
}

const SPEEDS = [1, 2, 4] as const

type LiveSnap = {
  home: PlayerBoxLine[]
  away: PlayerBoxLine[]
  homeName: string
  awayName: string
  timeoutsLeft: { home: number; away: number }
  userSide: TeamId
  onCourt: Player[]
  benchEnergy: Record<string, number>
}

function onCourtLines(
  scene: GameScene,
  team: TeamId
): PlayerBoxLine[] {
  const onCourtIds = new Set(
    scene.players.filter((p) => p.team === team).map((p) => p.id)
  )
  return scene.boxScore[team]
    .filter((l) => onCourtIds.has(l.playerId))
    .map((l) => ({ ...l }))
}

function snapshotScene(scene: GameScene, userSide: TeamId): LiveSnap {
  return {
    home: onCourtLines(scene, 'home'),
    away: onCourtLines(scene, 'away'),
    homeName: scene.teamNames.home,
    awayName: scene.teamNames.away,
    timeoutsLeft: { ...scene.timeoutsLeft },
    userSide,
    onCourt: scene.players
      .filter((p) => p.team === userSide)
      .map((p) => ({
        ...p,
        position: { ...p.position },
        target: { ...p.target }
      })),
    benchEnergy: { ...scene.benchEnergy }
  }
}

export default function CourtCanvas({
  matchup,
  userTeamId,
  onComplete,
  onExit
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const sceneRef = useRef<GameScene | null>(null)
  const inTimeoutRef = useRef(false)
  const userSide: TeamId =
    matchup.home.id === userTeamId ? 'home' : 'away'
  const userRoster =
    userSide === 'home' ? matchup.home : matchup.away

  const controlsRef = useRef<LoopControls>({ speed: 1, paused: false })
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [inTimeout, setInTimeout] = useState(false)
  const [live, setLive] = useState<LiveSnap | null>(null)

  useEffect(() => {
    controlsRef.current.speed = speed
    controlsRef.current.paused = paused || inTimeout
  }, [speed, paused, inTimeout])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    completedRef.current = false
    inTimeoutRef.current = false
    setInTimeout(false)
    setPaused(false)
    setSpeed(1)
    controlsRef.current.speed = 1
    controlsRef.current.paused = false
    const scene = createInitialScene(matchup, {
      userManagedTeam: userSide
    })
    sceneRef.current = scene
    setLive(snapshotScene(scene, userSide))

    const resize = (): void => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const width = parent.clientWidth
      const height = parent.clientHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()

    const observer = new ResizeObserver(() => {
      resize()
    })
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement)
    }

    const controls = controlsRef.current
    let snapAccum = 0
    const stopLoop = startGameLoop({
      controls,
      step: (dt) => {
        stepScene(scene, dt)
        snapAccum += dt
        if (snapAccum >= 0.2) {
          snapAccum = 0
          setLive(snapshotScene(scene, userSide))
        }
        if (scene.phase === 'final' && !completedRef.current) {
          completedRef.current = true
          setLive(snapshotScene(scene, userSide))
          onCompleteRef.current(resultFromScene(scene, matchup, userTeamId))
        }
      },
      render: () => {
        const parent = canvas.parentElement
        if (!parent) return
        paintScene(ctx, parent.clientWidth, parent.clientHeight, scene)
      }
    })

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (inTimeoutRef.current || completedRef.current) return
      if (!canCallTimeout(scene, userSide)) {
        showCallout(scene, 'CANNOT TIMEOUT', 0.8)
        return
      }
      if (!callTimeout(scene, userSide)) return
      tryCoachSubs(scene, { teams: [otherTeam(userSide)] })
      inTimeoutRef.current = true
      setInTimeout(true)
      setPaused(true)
      setLive(snapshotScene(scene, userSide))
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      stopLoop()
      observer.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      sceneRef.current = null
    }
  }, [matchup, userTeamId, userSide])

  const handleResume = (): void => {
    const scene = sceneRef.current
    if (scene) {
      setUserLineupHold(scene)
      resumeAfterTimeout(scene)
    }
    inTimeoutRef.current = false
    setInTimeout(false)
    setPaused(false)
  }

  const handleSwap = (outId: string, bench: RosterPlayer): void => {
    const scene = sceneRef.current
    if (!scene) return
    substitutePlayer(scene, outId, bench)
    setLive(snapshotScene(scene, userSide))
  }

  const timeoutsLeft = live?.timeoutsLeft[userSide] ?? 2

  return (
    <div className="watch-shell">
      <div className="watch-bar">
        {onExit && (
          <button type="button" className="btn watch-bar-btn" onClick={onExit}>
            Exit without saving
          </button>
        )}
        <span className="watch-to-hint">
          Space · Timeout ({timeoutsLeft} left) · AI rotates both benches
        </span>
        <div className="watch-spacer" />
        <div className="watch-speeds" role="group" aria-label="Playback speed">
          <button
            type="button"
            className={`btn watch-bar-btn ${paused && !inTimeout ? 'is-active' : ''}`}
            onClick={() => {
              if (inTimeout) return
              setPaused((p) => !p)
            }}
          >
            {paused && !inTimeout ? 'Resume' : 'Pause'}
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn watch-bar-btn ${!paused && !inTimeout && speed === s ? 'is-active' : ''}`}
              onClick={() => {
                if (inTimeout) return
                setSpeed(s)
                setPaused(false)
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div className="watch-body">
        <div className="watch-court">
          <canvas
            ref={canvasRef}
            className="court-canvas"
            aria-label="Basketball court"
          />
          {paused && !inTimeout && (
            <div className="watch-paused">Paused</div>
          )}
          {inTimeout && live && (
            <TimeoutOverlay
              team={userRoster}
              onCourt={live.onCourt}
              benchEnergy={live.benchEnergy}
              timeoutsLeft={live.timeoutsLeft[userSide]}
              onSwap={handleSwap}
              onResume={handleResume}
            />
          )}
        </div>
        <div className="watch-boxes">
          <aside className="watch-box" aria-label="Home box score">
            {live && (
              <BoxScoreTable title={live.homeName} lines={live.home} compact />
            )}
          </aside>
          <aside className="watch-box" aria-label="Away box score">
            {live && (
              <BoxScoreTable title={live.awayName} lines={live.away} compact />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
