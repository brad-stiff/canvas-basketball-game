import {
  OFFENSIVE_PLAYS,
  type OffensivePlayId,
  type UserCoaching
} from '@game/sim/coachingTypes'

type AttackOption = {
  id: string
  name: string
  number: number
}

type Props = {
  coaching: UserCoaching
  onCourt: AttackOption[]
  active: boolean
  onChange: (next: UserCoaching) => void
}

function playLabel(id: OffensivePlayId): string {
  return OFFENSIVE_PLAYS.find((p) => p.id === id)?.label ?? id
}

export default function OffenseCoachPanel({
  coaching,
  onCourt,
  active,
  onChange
}: Props) {
  const enqueue = (id: OffensivePlayId): void => {
    onChange({ ...coaching, playQueue: [...coaching.playQueue, id] })
  }

  const removeAt = (index: number): void => {
    onChange({
      ...coaching,
      playQueue: coaching.playQueue.filter((_, i) => i !== index)
    })
  }

  const move = (index: number, dir: -1 | 1): void => {
    const next = index + dir
    if (next < 0 || next >= coaching.playQueue.length) return
    const queue = [...coaching.playQueue]
    const tmp = queue[index]!
    queue[index] = queue[next]!
    queue[next] = tmp
    onChange({ ...coaching, playQueue: queue })
  }

  const attackStillOnCourt =
    coaching.attackPlayerId != null &&
    onCourt.some((p) => p.id === coaching.attackPlayerId)

  return (
    <div
      className={`coach-panel ${active ? 'is-active' : 'is-dimmed'}`}
      aria-label="Offense coaching"
      aria-disabled={!active}
    >
      <p className="coach-kicker">Offense</p>
      <h3 className="coach-title">Play queue</h3>
      <ul className="coach-queue">
        {coaching.playQueue.length === 0 && (
          <li className="coach-muted">Empty — AI freestyle</li>
        )}
        {coaching.playQueue.map((play, index) => (
          <li key={`${play}-${index}`} className="coach-queue-row">
            <span className="coach-queue-label">
              {index + 1}. {playLabel(play)}
            </span>
            <span className="coach-queue-actions">
              <button
                type="button"
                className="btn coach-mini-btn"
                disabled={!active || index === 0}
                onClick={() => move(index, -1)}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn coach-mini-btn"
                disabled={!active || index === coaching.playQueue.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn coach-mini-btn"
                disabled={!active}
                onClick={() => removeAt(index)}
                aria-label="Remove"
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      <label className="coach-field">
        <span>Add play</span>
        <select
          className="coach-select"
          disabled={!active}
          value=""
          onChange={(e) => {
            const id = e.target.value as OffensivePlayId
            if (!id) return
            enqueue(id)
            e.target.value = ''
          }}
        >
          <option value="">Select…</option>
          {OFFENSIVE_PLAYS.map((play) => (
            <option key={play.id} value={play.id}>
              {play.label}
            </option>
          ))}
        </select>
      </label>
      <label className="coach-field">
        <span>Player to attack</span>
        <select
          className="coach-select"
          disabled={!active}
          value={attackStillOnCourt ? coaching.attackPlayerId ?? '' : ''}
          onChange={(e) =>
            onChange({
              ...coaching,
              attackPlayerId: e.target.value || null
            })
          }
        >
          <option value="">Auto</option>
          {onCourt.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.number} {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
