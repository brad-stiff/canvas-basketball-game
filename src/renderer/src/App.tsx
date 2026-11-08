import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createDefaultLeague,
  getTeam,
  getUserTeam,
  updateLeagueTeam
} from '@game/roster/generate'
import type { League } from '@game/roster/types'
import { applyGameResult, createSeason, nextGame } from '@game/season/schedule'
import { simulateGame } from '@game/season/simulate'
import type { GameResult, Season } from '@game/season/types'
import BoxScoreView from './components/BoxScoreView'
import CourtCanvas from './components/CourtCanvas'
import { clearCareer, loadCareer, writeCareer } from './save/career'
import HubScreen from './screens/HubScreen'
import LineupScreen from './screens/LineupScreen'

type Screen = 'hub' | 'lineup' | 'watch'

function createBootState(): { league: League; season: Season } {
  const league = createDefaultLeague()
  return { league, season: createSeason(league) }
}

export default function App() {
  const bootRef = useRef<ReturnType<typeof createBootState> | null>(null)
  if (!bootRef.current) bootRef.current = createBootState()

  const [league, setLeague] = useState(bootRef.current.league)
  const [season, setSeason] = useState(bootRef.current.season)
  const [screen, setScreen] = useState<Screen>('hub')
  const [boxResult, setBoxResult] = useState<GameResult | null>(null)
  const [simBusy, setSimBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [saveNote, setSaveNote] = useState<string | null>(null)
  const skipNextAutosave = useRef(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const saved = await loadCareer()
      if (cancelled) return
      if (saved) {
        setLeague(saved.league)
        setSeason(saved.season)
        setSaveNote(`Resumed save from ${new Date(saved.savedAt).toLocaleString()}`)
      }
      setReady(true)
      // Allow autosave after initial load settles
      window.setTimeout(() => {
        skipNextAutosave.current = false
      }, 0)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || skipNextAutosave.current) return
    const handle = window.setTimeout(() => {
      void writeCareer(league, season).then((res) => {
        if (res.ok) {
          setSaveNote(`Saved ${new Date().toLocaleTimeString()}`)
        }
      })
    }, 400)
    return () => window.clearTimeout(handle)
  }, [league, season, ready])

  const userTeam = getUserTeam(league)
  const upcoming = nextGame(season)

  const matchup = useMemo(() => {
    if (!upcoming) return null
    const home = getTeam(league, upcoming.homeTeamId)
    const away = getTeam(league, upcoming.awayTeamId)
    if (!home || !away) return null
    return { home, away }
  }, [league, upcoming])

  const finishGame = (result: GameResult): void => {
    const game = nextGame(season)
    if (!game) return
    setSeason((prev) => applyGameResult(prev, game.id, result))
    setBoxResult(result)
    setScreen('hub')
  }

  const handleSimNext = (): void => {
    if (!matchup || !upcoming || simBusy) return
    setSimBusy(true)
    window.setTimeout(() => {
      const result = simulateGame(matchup, season.userTeamId)
      setSeason((prev) => applyGameResult(prev, upcoming.id, result))
      setBoxResult(result)
      setScreen('hub')
      setSimBusy(false)
    }, 20)
  }

  const handleSaveNow = async (): Promise<void> => {
    const res = await writeCareer(league, season)
    if (res.ok) {
      setSaveNote(`Saved ${new Date().toLocaleTimeString()}`)
    } else {
      setSaveNote(res.message)
    }
  }

  const handleNewCareer = async (): Promise<void> => {
    const ok = window.confirm(
      'Start a new career? This clears your saved season and roster lineup changes.'
    )
    if (!ok) return
    await clearCareer()
    const next = createBootState()
    skipNextAutosave.current = true
    setLeague(next.league)
    setSeason(next.season)
    setBoxResult(null)
    setScreen('hub')
    setSaveNote('New career started')
    window.setTimeout(() => {
      skipNextAutosave.current = false
      void writeCareer(next.league, next.season)
    }, 0)
  }

  if (!ready) {
    return (
      <main className="app app-scroll">
        <div className="mgmt">
          <p className="mgmt-kicker">Canvas Basketball</p>
          <h1>Loading…</h1>
        </div>
      </main>
    )
  }

  if (screen === 'watch' && matchup) {
    return (
      <main className="app">
        <CourtCanvas
          matchup={matchup}
          userTeamId={season.userTeamId}
          onComplete={finishGame}
          onExit={() => setScreen('hub')}
        />
      </main>
    )
  }

  if (screen === 'lineup') {
    return (
      <main className="app app-scroll">
        <LineupScreen
          team={userTeam}
          onChange={(team) => setLeague((prev) => updateLeagueTeam(prev, team))}
          onBack={() => setScreen('hub')}
        />
      </main>
    )
  }

  return (
    <main className="app app-scroll">
      <HubScreen
        league={league}
        season={season}
        saveNote={saveNote}
        onOpenLineup={() => setScreen('lineup')}
        onWatchNext={() => setScreen('watch')}
        onSimNext={handleSimNext}
        onViewBox={setBoxResult}
        onSaveNow={() => void handleSaveNow()}
        onNewCareer={() => void handleNewCareer()}
      />
      {simBusy && (
        <div className="sim-toast" role="status">
          Simulating…
        </div>
      )}
      {boxResult && (
        <BoxScoreView result={boxResult} onClose={() => setBoxResult(null)} />
      )}
    </main>
  )
}
