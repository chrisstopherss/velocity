import { Clock, GraduationCap, Info, PhoneCall } from 'lucide-react';
import { formatClock } from '../game/sim';
import type { GameApi } from '../game/useGame';
import { ActiveCall } from '../panels/ActiveCall';
import { CallQueue } from '../panels/CallQueue';
import { MapView } from '../panels/MapView';
import { RadioLog } from '../panels/RadioLog';
import { ScoreCard } from '../panels/ScoreCard';
import { UnitStatus } from '../panels/UnitStatus';
import { ThemeSwitch } from '../theme/ThemeSwitch';

export function ModernShell({ g }: { g: GameApi }) {
  const { state, hint } = g;
  return (
    <div className="shell shell-modern">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/brand/logo.png" alt="" width={44} height={17} />
          <span className="wordmark">Velocity</span>
        </div>
        <p className="hint">
          <Info size={14} aria-hidden="true" />
          {hint}
        </p>
        <div className="topbar-right">
          {state.phase === 'ringing' ? <PhoneCall size={18} className="ring-icon" aria-label="Incoming 911" /> : null}
          <span className="chip">
            <Clock size={14} aria-hidden="true" />
            {formatClock(state.clock)}
          </span>
          <span className="chip">
            <GraduationCap size={14} aria-hidden="true" />
            Beginner
          </span>
          <ThemeSwitch />
        </div>
      </header>
      <main className="modern-grid">
        <div className="col">
          <UnitStatus g={g} />
          <CallQueue g={g} />
          <RadioLog g={g} />
        </div>
        <div className="col">
          <ActiveCall g={g} />
          <MapView g={g} />
        </div>
      </main>
      <ScoreCard g={g} />
    </div>
  );
}
