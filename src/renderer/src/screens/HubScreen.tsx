import {
  getTeam,
  getUserTeam,
  startersOf
} from '@game/roster/generate'
import { overallRating } from '@game/roster/ratings'
import type { League, TeamRoster } from '@game/roster/types'
import {
  nextGame,
  seasonComplete
} from '@game/season/schedule'
import { computeStandings, userRecord } from '@game/season/standings'
import type { GameResult, Season } from '@game/season/types'

type Props = {
  league: League
  season: Season
  saveNote: string | null
  onOpenLineup: () => void
  onOpenRosters: () => void
  onWatchNext: () => void
  onSimNext: () => void
  onViewBox: (result: GameResult) => void
  onSaveNow: () => void
  onNewCareer: () => void
}

export default function HubScreen({
  league,
  season,
  saveNote,
  onOpenLineup,
  onOpenRosters,
  onWatchNext,
  onSimNext,
  onViewBox,
  onSaveNow,
  onNewCareer
}: Props) {
  const user = getUserTeam(league)
  const record = userRecord(season)
  const upcoming = nextGame(season)
  const standings = computeStandings(league, season)
  const starterOvr = Math.round(
    startersOf(user).reduce((s, p) => s + overallRating(p), 0) / 5
  )
  const done = seasonComplete(season)

  const upcomingLabel = upcoming
    ? formatMatchup(league, season.userTeamId, upcoming)
    : null

  return (
    <div className="mgmt">
      <header className="mgmt-hero">
        <div className="mgmt-top">
          <p className="mgmt-kicker">Canvas Basketball · Season hub</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={onSaveNow}>
              Save now
            </button>
            <button type="button" className="btn" onClick={onNewCareer}>
              New career
            </button>
          </div>
        </div>
        <h1 style={{ color: user.color }}>{user.name}</h1>
        <p className="mgmt-sub">
          Record{' '}
          <strong>
            {record.wins}–{record.losses}
          </strong>
          {done
            ? ' · Season complete'
            : ` · Game ${season.nextIndex + 1} of ${season.games.length}`}
        </p>
        {saveNote && <p className="save-note">{saveNote}</p>}
      </header>

      <section className="mgmt-panel">
        <div className="mgmt-row">
          <div>
            <h2>Starting lineup</h2>
            <p className="mgmt-muted">Starter overall ~{starterOvr}</p>
          </div>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="btn" onClick={onOpenLineup}>
              Edit lineup
            </button>
            <button type="button" className="btn" onClick={onOpenRosters}>
              Team rosters
            </button>
          </div>
        </div>
        <StarterStrip team={user} />
      </section>

      <section className="mgmt-panel">
        <h2>Next game</h2>
        {done || !upcoming ? (
          <p className="mgmt-muted">No games left on the schedule.</p>
        ) : (
          <>
            <p className="next-matchup">{upcomingLabel}</p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={onWatchNext}>
                Watch game
              </button>
              <button type="button" className="btn" onClick={onSimNext}>
                Sim result
              </button>
            </div>
          </>
        )}
      </section>

      <section className="mgmt-panel">
        <h2>Standings</h2>
        <table className="roster-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>PF</th>
              <th>PA</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const team = getTeam(league, row.teamId)
              const isUser = row.teamId === season.userTeamId
              return (
                <tr key={row.teamId} className={isUser ? 'is-selected' : ''}>
                  <td className="name-cell">{team?.name ?? row.teamId}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.pointsFor}</td>
                  <td>{row.pointsAgainst}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mgmt-panel">
        <h2>Schedule</h2>
        <ul className="schedule-list">
          {season.games.map((game, i) => {
            const label = formatMatchup(league, season.userTeamId, game)
            const played = game.result != null
            const isNext = i === season.nextIndex
            return (
              <li key={game.id} className={isNext ? 'is-next' : ''}>
                <span className="day">#{game.day + 1}</span>
                <span className="match">{label}</span>
                {played && game.result ? (
                  <button
                    type="button"
                    className="btn btn-ghost schedule-score"
                    onClick={() => onViewBox(game.result!)}
                  >
                    {game.result.homeAbbrev} {game.result.homeScore}–
                    {game.result.awayScore} {game.result.awayAbbrev}
                  </button>
                ) : (
                  <span className="mgmt-muted">
                    {isNext ? 'Up next' : 'Scheduled'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function formatMatchup(
  league: League,
  userTeamId: string,
  game: { homeTeamId: string; awayTeamId: string }
): string {
  const home = getTeam(league, game.homeTeamId)
  const away = getTeam(league, game.awayTeamId)
  const homeName = home?.abbrev ?? '?'
  const awayName = away?.abbrev ?? '?'
  if (game.homeTeamId === userTeamId) return `vs ${away?.name ?? awayName} (home)`
  return `@ ${home?.name ?? homeName} (away)`
}

function StarterStrip({ team }: { team: TeamRoster }) {
  const starters = startersOf(team)
  return (
    <ul className="starter-strip">
      {starters.map((p) => (
        <li key={p.id}>
          <span className="pos">{p.pos}</span>
          <span className="name">{p.name}</span>
          <span className="ovr">{overallRating(p)}</span>
        </li>
      ))}
    </ul>
  )
}
