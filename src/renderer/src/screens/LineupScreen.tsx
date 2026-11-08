import { useState } from 'react'
import {
  benchOf,
  startersOf,
  swapLineup
} from '@game/roster/generate'
import { overallRating } from '@game/roster/ratings'
import type { RosterPlayer, TeamRoster } from '@game/roster/types'

type Props = {
  team: TeamRoster
  onChange: (team: TeamRoster) => void
  onBack: () => void
}

export default function LineupScreen({ team, onChange, onBack }: Props) {
  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(
    null
  )
  const starters = startersOf(team)
  const bench = benchOf(team)

  const trySwap = (benchId: string): void => {
    if (!selectedStarterId) return
    onChange(swapLineup(team, selectedStarterId, benchId))
    setSelectedStarterId(null)
  }

  return (
    <div className="mgmt">
      <header className="mgmt-hero compact">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>Lineup</h1>
        <p className="mgmt-sub">
          Select a starter, then a bench player to swap them.
        </p>
      </header>

      <section className="mgmt-panel">
        <h2>Starters</h2>
        <PlayerTable
          players={starters}
          selectedId={selectedStarterId}
          onSelect={(id) =>
            setSelectedStarterId((cur) => (cur === id ? null : id))
          }
        />
      </section>

      <section className="mgmt-panel">
        <h2>Bench</h2>
        <PlayerTable
          players={bench}
          selectedId={null}
          dimmed={!selectedStarterId}
          onSelect={trySwap}
        />
      </section>
    </div>
  )
}

function PlayerTable({
  players,
  selectedId,
  onSelect,
  dimmed = false
}: {
  players: RosterPlayer[]
  selectedId: string | null
  onSelect: (id: string) => void
  dimmed?: boolean
}) {
  return (
    <table className={`roster-table ${dimmed ? 'is-dimmed' : ''}`}>
      <thead>
        <tr>
          <th>Pos</th>
          <th>#</th>
          <th>Name</th>
          <th>OVR</th>
          <th>Spd</th>
          <th>Shot</th>
          <th>Fin</th>
          <th>Reb</th>
          <th>Def</th>
          <th>Sta</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => (
          <tr
            key={p.id}
            className={selectedId === p.id ? 'is-selected' : ''}
            onClick={() => onSelect(p.id)}
          >
            <td>{p.pos}</td>
            <td>{p.number}</td>
            <td className="name-cell">{p.name}</td>
            <td>{overallRating(p)}</td>
            <td>{p.speed}</td>
            <td>{p.shooting}</td>
            <td>{p.finishing}</td>
            <td>{p.rebounding}</td>
            <td>{p.defense}</td>
            <td>{p.stamina}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
