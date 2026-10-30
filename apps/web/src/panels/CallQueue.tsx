import { Phone } from 'lucide-react';
import { typeLabel } from '../data/content';
import { postalLabel } from '../data/postals';
import { formatClock } from '../game/sim';
import type { GameApi } from '../game/useGame';
import { Panel } from '../ui/Panel';

export function CallQueue({ g }: { g: GameApi }) {
  const { state } = g;
  const { incident, phase, clock } = state;
  const ringing = phase === 'ringing';

  return (
    <Panel title="Call queue" icon={<Phone size={16} aria-hidden="true" />} className="panel-queue">
      <table className="tbl">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Location</th>
            <th>P</th>
            <th>Age</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {ringing ? (
            <tr className="row-ring">
              <td>911</td>
              <td>Incoming call</td>
              <td>Unknown</td>
              <td>-</td>
              <td>{formatClock(clock - state.ringAt)}</td>
              <td>Ringing</td>
            </tr>
          ) : null}
          {incident ? (
            <tr className={`prio-${incident.priority}`}>
              <td>{incident.id}</td>
              <td>{typeLabel(incident.type)}</td>
              <td>{postalLabel(incident.postal)}</td>
              <td>
                <span className={`pri p${incident.priority}`}>{incident.priority}</span>
              </td>
              <td>{formatClock(clock - incident.createdAt)}</td>
              <td>{incident.dispatchedAt === null ? 'Pending' : 'Dispatched'}</td>
            </tr>
          ) : null}
          {!ringing && !incident ? (
            <tr>
              <td colSpan={6} className="empty">
                No calls right now.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Panel>
  );
}
