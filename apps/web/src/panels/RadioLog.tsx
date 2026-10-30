import { Radio } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatClock } from '../game/sim';
import type { GameApi } from '../game/useGame';
import { Panel } from '../ui/Panel';

export function RadioLog({ g }: { g: GameApi }) {
  const lines = g.state.radio;
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [lines.length]);

  return (
    <Panel title="Radio log" icon={<Radio size={16} aria-hidden="true" />} extra="Channel 1" className="panel-radio">
      <div className="radio-lines" role="log" aria-live="polite">
        {lines.length === 0 ? <p className="empty">Quiet on the radio.</p> : null}
        {lines.map((l) => (
          <p key={l.id} className={l.emergency ? 'tx' : ''}>
            <time>{formatClock(l.t)}</time>
            <b>{l.from}</b>
            {l.text}
          </p>
        ))}
        <div ref={end} />
      </div>
    </Panel>
  );
}
