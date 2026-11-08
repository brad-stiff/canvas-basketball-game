import type { PlayerBoxLine } from '@game/season/types'

function formatPlusMinus(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

/** Format game-clock seconds played as m:ss. */
function formatMinutes(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export default function BoxScoreTable({
  title,
  lines,
  compact = false
}: {
  title: string
  lines: PlayerBoxLine[]
  compact?: boolean
}) {
  return (
    <section className={`box-block ${compact ? 'box-block-live' : ''}`}>
      <h3>{title}</h3>
      <table className={`roster-table ${compact ? 'box-table-live' : ''}`}>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>FG</th>
            <th>3PT</th>
            <th>FT</th>
            <th>+/-</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.playerId}>
              <td>{l.number}</td>
              <td className="name-cell">{l.name}</td>
              <td>{formatMinutes(l.minutes ?? 0)}</td>
              <td>{l.points}</td>
              <td>
                {l.fgm}-{l.fga}
              </td>
              <td>
                {l.tpm}-{l.tpa}
              </td>
              <td>
                {l.ftm}-{l.fta}
              </td>
              <td
                className={
                  l.plusMinus > 0
                    ? 'pm-pos'
                    : l.plusMinus < 0
                      ? 'pm-neg'
                      : undefined
                }
              >
                {formatPlusMinus(l.plusMinus)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
