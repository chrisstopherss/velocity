import { Award } from 'lucide-react';
import type { GameApi } from '../game/useGame';

export function ScoreCard({ g }: { g: GameApi }) {
  const { state, dispatch } = g;
  if (state.phase !== 'closed' || !state.score) return null;
  const { score } = state;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Call score">
      <div className="score-card">
        <h2>
          <Award size={20} aria-hidden="true" />
          Call score: {score.total} / 100
        </h2>
        <p className="muted">{score.reveal}</p>
        <table className="tbl">
          <tbody>
            {score.lines.map((l) => (
              <tr key={l.label}>
                <td>{l.label}</td>
                <td>
                  {l.points} / {l.max}
                </td>
                <td className="muted">{l.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="form-actions">
          <button type="button" className="btn primary" autoFocus onClick={() => dispatch({ type: 'next' })}>
            Next call
          </button>
        </div>
      </div>
    </div>
  );
}
