import { useState } from 'react'
import { overallRating } from '@game/roster/ratings'
import type { RosterPlayer, TeamRoster } from '@game/roster/types'
import type { Player } from '@game/types'

type Props = {
  team: TeamRoster
  onCourt: Player[]
  benchEnergy: Record<string, number>
  timeoutsLeft: number
  onSwap: (outPlayerId: string, benchPlayer: RosterPlayer) => void
  onResume: () => void
}

export default function TimeoutOverlay({
  team,
  onCourt,
  benchEnergy,
  timeoutsLeft,
  onSwap,
  onResume
}: Props) {
  const [selectedOutId, setSelectedOutId] = useState<string | null>(null)
  const onCourtIds = new Set(onCourt.map((p) => p.id))
  const bench = team.players.filter((p) => !onCourtIds.has(p.id))

  const trySwap = (benchPlayer: RosterPlayer): void => {
    if (!selectedOutId) return
    onSwap(selectedOutId, benchPlayer)
    setSelectedOutId(null)
  }

  return (
    <div className="timeout-overlay" role="dialog" aria-modal="true">
      <div className="timeout-panel">
        <header className="timeout-header">
          <div>
            <p className="timeout-kicker">Timeout</p>
            <h2>{team.name}</h2>
            <p className="timeout-sub">
              {timeoutsLeft} timeout{timeoutsLeft === 1 ? '' : 's'} left this
              half · select an on-court player, then a bench player to sub
            </p>
          </div>
          <button type="button" className="btn" onClick={onResume}>
            Resume
          </button>
        </header>

        <div className="timeout-cols">
          <section>
            <h3>On court</h3>
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>#</th>
                  <th>Name</th>
                  <th>OVR</th>
                  <th>EN</th>
                </tr>
              </thead>
              <tbody>
                {onCourt.map((p) => (
                  <tr
                    key={p.id}
                    className={selectedOutId === p.id ? 'is-selected' : ''}
                    onClick={() =>
                      setSelectedOutId((cur) => (cur === p.id ? null : p.id))
                    }
                  >
                    <td>{p.pos}</td>
                    <td>{p.number}</td>
                    <td className="name-cell">{p.name}</td>
                    <td>
                      {overallRating({
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
                      })}
                    </td>
                    <td>{Math.round(p.energy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h3>Bench</h3>
            <table
              className={`roster-table ${!selectedOutId ? 'is-dimmed' : ''}`}
            >
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>#</th>
                  <th>Name</th>
                  <th>OVR</th>
                  <th>EN</th>
                </tr>
              </thead>
              <tbody>
                {bench.map((p) => (
                  <tr key={p.id} onClick={() => trySwap(p)}>
                    <td>{p.pos}</td>
                    <td>{p.number}</td>
                    <td className="name-cell">{p.name}</td>
                    <td>{overallRating(p)}</td>
                    <td>{Math.round(benchEnergy[p.id] ?? 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}
