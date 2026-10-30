import { Send, Star, Users } from 'lucide-react';
import { postalLabel } from '../data/postals';
import { etaSeconds, formatClock, nearestPostal } from '../game/sim';
import type { UnitStatus as Status } from '../game/types';
import type { GameApi } from '../game/useGame';
import { Panel } from '../ui/Panel';
import { agencyName } from '../data/content';

const statusText: Record<Status, string> = {
  available: 'Available',
  enroute: 'En route',
  onscene: 'On scene',
};

export function UnitStatus({ g }: { g: GameApi }) {
  const { state, selected, toggle, sendSelected } = g;
  const { incident, phase, units, scenario } = state;
  const canPick = phase === 'incident' && incident !== null;

  const recommended = new Set<string>();
  if (canPick && incident) {
    units
      .filter((u) => u.status === 'available')
      .map((u) => ({ id: u.id, eta: etaSeconds(u, incident.postal) ?? Infinity }))
      .sort((a, b) => a.eta - b.eta)
      .slice(0, scenario.truth.minUnits)
      .forEach((u) => recommended.add(u.id));
  }

  return (
    <Panel title="Unit status" icon={<Users size={16} aria-hidden="true" />} className="panel-units">
      <table className="tbl">
        <thead>
          <tr>
            <th />
            <th>Unit</th>
            <th>Agency</th>
            <th>Status</th>
            <th>Location</th>
            <th>ETA</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => {
            const pickable = canPick && u.status === 'available';
            const eta = canPick && incident ? etaSeconds(u, incident.postal) : null;
            const at = nearestPostal(u.x, u.y);
            return (
              <tr key={u.id} className={`unit-${u.status}`}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${u.name}`}
                    disabled={!pickable}
                    checked={selected.includes(u.id)}
                    onChange={() => toggle(u.id)}
                  />
                </td>
                <td>
                  <strong>{u.name}</strong>
                  {recommended.has(u.id) ? (
                    <Star size={12} className="rec" aria-label="Recommended" />
                  ) : null}
                </td>
                <td title={agencyName(u.agency)}>{u.agency}</td>
                <td className={`st st-${u.status}`}>{statusText[u.status]}</td>
                <td>{at ? postalLabel(at) : '-'}</td>
                <td>{u.status === 'available' && eta !== null ? formatClock(eta) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="panel-foot">
        <button type="button" className="btn primary" disabled={!selected.length || !canPick} onClick={sendSelected}>
          <Send size={14} aria-hidden="true" />
          Dispatch{selected.length ? ` (${selected.length})` : ''}
        </button>
        <span className="muted">Starred units are the nearest.</span>
      </div>
    </Panel>
  );
}
