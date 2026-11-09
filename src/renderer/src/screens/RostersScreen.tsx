import { useState } from 'react'
import { benchOf, getTeam, startersOf } from '@game/roster/generate'
import { overallRating } from '@game/roster/ratings'
import type { League, RosterPlayer } from '@game/roster/types'

type Props = {
  league: League
  onBack: () => void
}

export default function RostersScreen({ league, onBack }: Props) {
  const [selectedTeamId, setSelectedTeamId] = useState(league.userTeamId)
  const team = getTeam(league, selectedTeamId) ?? league.teams[0]!
  const starters = startersOf(team)
  const bench = benchOf(team)

  return (
    <div className="mgmt">
      <header className="mgmt-hero compact">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>Team rosters</h1>
        <p className="mgmt-sub">Browse every roster in the league.</p>
      </header>

      <section className="mgmt-panel">
        <h2>Teams</h2>
        <div className="btn-row team-picker">
          {league.teams.map((t) => {
            const selected = t.id === team.id
            return (
              <button
                key={t.id}
                type="button"
                className={`btn ${selected ? 'btn-primary' : ''}`}
                style={{ borderColor: t.color }}
                onClick={() => setSelectedTeamId(t.id)}
              >
                <span style={{ color: selected ? undefined : t.color }}>
                  {t.abbrev}
                </span>{' '}
                {t.name}
                {t.id === league.userTeamId ? ' · You' : ''}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mgmt-panel">
        <h2 style={{ color: team.color }}>{team.name}</h2>
        <p className="mgmt-muted" style={{ marginBottom: '0.75rem' }}>
          Starters
        </p>
        <PlayerTable players={starters} />
        <p className="mgmt-muted" style={{ margin: '1.25rem 0 0.75rem' }}>
          Bench
        </p>
        <PlayerTable players={bench} />
      </section>
    </div>
  )
}

function PlayerTable({ players }: { players: RosterPlayer[] }) {
  return (
    <table className="roster-table roster-table-static">
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
          <tr key={p.id}>
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
