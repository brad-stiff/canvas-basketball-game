import type { GameResult } from '@game/season/types'
import BoxScoreTable from './BoxScoreTable'

type Props = {
  result: GameResult
  onClose: () => void
}

export default function BoxScoreView({ result, onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-header">
          <h2>
            {result.homeAbbrev} {result.homeScore} — {result.awayScore}{' '}
            {result.awayAbbrev}
          </h2>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>
        <BoxScoreTable title={result.homeName} lines={result.box.home} />
        <BoxScoreTable title={result.awayName} lines={result.box.away} />
      </div>
    </div>
  )
}
