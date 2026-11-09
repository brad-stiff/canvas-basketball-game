import {
  DEFENSIVE_SCHEMES,
  SCREEN_DEFENSES,
  type DefensiveScheme,
  type ScreenDefense,
  type UserCoaching
} from '@game/sim/coachingTypes'

type Props = {
  coaching: UserCoaching
  active: boolean
  onChange: (next: UserCoaching) => void
}

export default function DefenseCoachPanel({
  coaching,
  active,
  onChange
}: Props) {
  return (
    <div
      className={`coach-panel ${active ? 'is-active' : 'is-dimmed'}`}
      aria-label="Defense coaching"
      aria-disabled={!active}
    >
      <p className="coach-kicker">Defense</p>
      <h3 className="coach-title">Scheme</h3>
      <label className="coach-field">
        <span>Defensive play</span>
        <select
          className="coach-select"
          disabled={!active}
          value={coaching.scheme}
          onChange={(e) =>
            onChange({
              ...coaching,
              scheme: e.target.value as DefensiveScheme
            })
          }
        >
          {DEFENSIVE_SCHEMES.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.label}
            </option>
          ))}
        </select>
      </label>
      <h3 className="coach-title">Screens</h3>
      <div className="coach-toggle-row" role="group" aria-label="Screen defense">
        {SCREEN_DEFENSES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`btn coach-toggle-btn ${
              coaching.screenDefense === option.id ? 'is-active' : ''
            }`}
            disabled={!active}
            onClick={() =>
              onChange({
                ...coaching,
                screenDefense: option.id as ScreenDefense
              })
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
