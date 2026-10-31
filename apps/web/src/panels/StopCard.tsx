import { Car, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { fullName } from '../data/people';
import { backupNeeded, isOpen, nearestAvailable, stillNeeded, stopWhere } from '../game/stops';
import { formatClock } from '../game/sim';
import type { Stop, StopOutcome } from '../game/types';
import type { GameApi } from '../game/useGame';

const headline: Record<StopOutcome, { tone: 'ok' | 'warn' | 'bad'; title: string; note: string }> = {
  routine: { tone: 'ok', title: 'No wants', note: 'Registration valid. The unit will handle the stop.' },
  expired: { tone: 'warn', title: 'Registration expired', note: 'Otherwise valid, no wants. The unit will handle it.' },
  warrant: { tone: 'bad', title: 'Owner has a warrant', note: 'Hit not confirmed. The unit asks for a unit to back them up.' },
  stolen: { tone: 'bad', title: 'Stolen vehicle', note: 'Hit not confirmed. The unit asks for a unit to back them up.' },
  felony: { tone: 'bad', title: 'Armed felony match', note: 'Use extreme caution. The unit asks for two units.' },
};

interface Pos {
  x: number;
  y: number;
}

// the card sits bottom right by default and can be dragged by its title bar
function useDrag() {
  const [pos, setPos] = useState<Pos | null>(null);
  const card = useRef<HTMLElement>(null);
  const start = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || !card.current) return;
    const box = card.current.getBoundingClientRect();
    const dx = e.clientX - box.left;
    const dy = e.clientY - box.top;
    const move = (m: PointerEvent) =>
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 80, m.clientX - dx)),
        y: Math.max(0, Math.min(window.innerHeight - 40, m.clientY - dy)),
      });
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };
  const style = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined;
  return { card, start, style };
}

const spaced = (plate: string) => plate.split('').join(' ');
const at = (stop: Stop, t: number | null) => (t === null ? null : formatClock(t - stop.startedAt));

function Status({ g, stop }: { g: GameApi; stop: Stop }) {
  const { clock } = g.state;
  if (stop.ackAt === null) {
    return (
      <p className="stop-status info">
        <Info size={16} aria-hidden="true" />
        <span>
          <b className="mono">{formatClock(clock - stop.startedAt)}</b> Waiting for you. Copy the stop so the unit knows dispatch has it.
        </span>
      </p>
    );
  }
  if (stop.plateAskedAt === null) {
    return (
      <p className="stop-status info">
        <Info size={16} aria-hidden="true" />
        <span>Copied. Run the plate when you are ready.</span>
      </p>
    );
  }
  if (stop.plateResult === null) {
    return (
      <p className="stop-status info">
        <Info size={16} aria-hidden="true" />
        <span>Running the plate.</span>
      </p>
    );
  }
  const h = headline[stop.outcome];
  const Icon = h.tone === 'ok' ? CircleCheck : h.tone === 'warn' ? Info : TriangleAlert;
  return (
    <p className={`stop-status ${h.tone}`}>
      <Icon size={16} aria-hidden="true" />
      <span>
        <b>{h.title}</b>
        {h.note}
      </span>
    </p>
  );
}

function Closed({ g }: { g: GameApi }) {
  const [hidden, setHidden] = useState(false);
  const drag = useDrag();
  const result = g.state.stopResults[g.state.stopResults.length - 1];
  if (!result || hidden) return null;
  const tone = result.total >= 80 ? 'ok' : result.total >= 50 ? 'warn' : 'bad';
  return (
    <section className="stop-card" aria-label="Last traffic stop" ref={drag.card} style={drag.style}>
      <header className="stop-hd" onPointerDown={drag.start}>
        <Car size={16} aria-hidden="true" />
        <b>Traffic stop {result.id}</b>
        <small>{result.unitId}</small>
        <button type="button" className="icon-btn" aria-label="Close stop result" onClick={() => setHidden(true)}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <div className="stop-bd">
        <p className="stop-score">
          <span className="big">{result.total}</span>
          <span className="muted">/ 100</span>
          <span className={`verdict ${tone}`}>{tone === 'ok' ? 'Handled well' : tone === 'warn' ? 'Could be quicker' : 'Needs work'}</span>
        </p>
        <ul className="stop-notes">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <div className="stop-btns">
          <button type="button" className="btn primary" autoFocus onClick={() => setHidden(true)}>
            Done
          </button>
        </div>
      </div>
    </section>
  );
}

export function StopCard({ g }: { g: GameApi }) {
  const { state, dispatch, selected } = g;
  const drag = useDrag();
  const stop = state.stops.find(isOpen);
  if (!stop) return <Closed g={g} />;

  const nearest = nearestAvailable(state.units, stop.postal, stillNeeded(stop));
  const ids = selected.length ? selected : nearest;

  const needed = backupNeeded(stop.outcome);
  const copied = stop.ackAt !== null;
  const ran = stop.plateAskedAt !== null;
  const events: [string, string, boolean?][] = [['00:00', 'Called in']];
  if (stop.ackAt !== null) events.push([at(stop, stop.ackAt)!, 'Copied']);
  if (stop.plateAskedAt !== null) events.push([at(stop, stop.plateAskedAt)!, 'Plate run']);
  if (stop.plateAt !== null) events.push([at(stop, stop.plateAt)!, needed ? 'Returned, backup requested' : 'Returned, no backup needed', needed > 0]);
  if (stop.backupSentAt !== null) events.push([at(stop, stop.backupSentAt)!, `Backup sent (${stop.backupIds.length})`]);
  if (stop.backupArrivedAt !== null) events.push([at(stop, stop.backupArrivedAt)!, 'Backup on scene']);

  return (
    <section className="stop-card" aria-label="Traffic stop" ref={drag.card} style={drag.style}>
      <header className="stop-hd" onPointerDown={drag.start}>
        <Car size={16} aria-hidden="true" />
        <b>Traffic stop {stop.id}</b>
        <small>{stop.unitId}</small>
      </header>
      <div className="stop-bd">
        <Status g={g} stop={stop} />
        <div className="stop-btns">
          <button type="button" className={`btn${copied ? '' : ' primary'}`} disabled={copied} onClick={() => dispatch({ type: 'stopCopy' })}>
            Copy
          </button>
          <button type="button" className={`btn${copied && !ran ? ' primary' : ''}`} disabled={!copied || ran} onClick={() => dispatch({ type: 'stopPlate' })}>
            Run plate
          </button>
          <button type="button" className="btn" disabled={!copied} onClick={() => g.openLookup(stop.plateAskedAt === null ? stop.plate : fullName(stop.driver))}>
            Search records
          </button>
          <button
            type="button"
            className={`btn${stop.backupAskedAt !== null ? ' primary' : ''}`}
            disabled={!copied || !ids.length}
            onClick={() => {
              dispatch({ type: 'stopBackup', unitIds: ids });
              g.clearSelected();
            }}
          >
            Send backup{ids.length ? ` (${ids.length})` : ''}
          </button>
        </div>
        {copied && !selected.length && ids.length ? (
          <p className="muted stop-hint">Sends {ids.join(', ')}, the nearest. Tick other units in the unit status panel to choose.</p>
        ) : null}
        <div className="stop-veh">
          <span className="plate">
            <i>LIBERTY COUNTY</i>
            <b>{stop.plate.slice(0, 3)} {stop.plate.slice(3)}</b>
          </span>
          <div>
            <b>{stop.vehicle}</b>
            <div className="muted">1 occupant, as called in</div>
          </div>
        </div>
        <dl className="stop-kv">
          <dt>Location</dt>
          <dd>{stopWhere(stop)}</dd>
          <dt>Plate read back</dt>
          <dd className="mono">{spaced(stop.plate)}</dd>
          {stop.backupAskedAt !== null && stop.backupIds.length < needed ? (
            <>
              <dt>Backup</dt>
              <dd className="bad">None sent yet, {formatClock(state.clock - stop.backupAskedAt)}</dd>
            </>
          ) : null}
        </dl>
        <ol className="stop-tl">
          {events.map(([t, label, bad]) => (
            <li key={label}>
              <span className="mono muted">{t}</span>
              <span className={bad ? 'bad' : ''}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
