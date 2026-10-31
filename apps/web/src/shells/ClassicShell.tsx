import { CheckCircle2, ClipboardList, GraduationCap, PhoneCall, Send } from 'lucide-react';
import { formatClock } from '../game/sim';
import type { GameApi } from '../game/useGame';
import { ActiveCall } from '../panels/ActiveCall';
import { CallQueue } from '../panels/CallQueue';
import { MapView } from '../panels/MapView';
import { RadioLog } from '../panels/RadioLog';
import { ScoreCard } from '../panels/ScoreCard';
import { UnitStatus } from '../panels/UnitStatus';
import { ThemeSwitch } from '../theme/ThemeSwitch';

export function ClassicShell({ g }: { g: GameApi }) {
  const { state, dispatch, selected, sendSelected, hint } = g;
  const { phase, incident } = state;
  const canClear = phase === 'incident' && incident?.dispatchedAt !== null && incident !== null;

  return (
    <div className="shell shell-classic">
      <div className="menubar">
        <span className="welcome">
          <img src="/brand/logo.png" alt="" width={40} height={16} />
          Welcome to Velocity CAD
        </span>
        <ThemeSwitch />
      </div>

      <div className="fkeys">
        <button type="button" disabled={phase !== 'ringing'} onClick={() => dispatch({ type: 'answer' })}>
          <em>F1</em>
          <PhoneCall size={24} aria-hidden="true" />
          Answer
        </button>
        <button type="button" disabled={!selected.length || phase !== 'incident'} onClick={sendSelected}>
          <em>F5</em>
          <Send size={24} aria-hidden="true" />
          Dispatch
        </button>
        <button type="button" disabled={!canClear} onClick={() => dispatch({ type: 'clear' })}>
          <em>F12</em>
          <ClipboardList size={24} aria-hidden="true" />
          Clear call
        </button>
      </div>

      <div className="sline">
        <span>
          Call: <b>{incident?.id ?? (phase === 'ringing' ? '911' : '-')}</b>
        </span>
        <span>
          Shift <b>{formatClock(state.clock)}</b>
        </span>
        <span className="mode">
          <GraduationCap size={14} aria-hidden="true" />
          Beginner
        </span>
        <span className="hint">{hint}</span>
      </div>

      <main className="classic-grid">
        <div className="area-units">
          <UnitStatus g={g} />
        </div>
        <div className="area-map">
          <MapView g={g} />
        </div>
        <div className="area-radio">
          <RadioLog g={g} />
        </div>
        <div className="area-queue">
          <CallQueue g={g} />
        </div>
        <div className="area-call">
          <ActiveCall g={g} />
        </div>
      </main>

      <div className="sbar">
        <span>Mode: Beginner</span>
        <span>Units {state.units.length}</span>
        <span className="online">
          <CheckCircle2 size={13} aria-hidden="true" />
          Online
        </span>
      </div>
      <ScoreCard g={g} />
    </div>
  );
}
