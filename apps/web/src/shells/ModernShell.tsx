import { Clock, GraduationCap, Info, PhoneCall, Search } from 'lucide-react';
import { formatClock } from '../game/sim';
import type { GameApi } from '../game/useGame';
import { ActiveCall } from '../panels/ActiveCall';
import { CallQueue } from '../panels/CallQueue';
import { MapView } from '../panels/MapView';
import { RadioLog } from '../panels/RadioLog';
import { RecordsSearch } from '../panels/RecordsSearch';
import { ScoreCard } from '../panels/ScoreCard';
import { UnitStatus } from '../panels/UnitStatus';
import { ThemeSwitch } from '../theme/ThemeSwitch';
import { resizeAt, Splitter, tracks, useSizes } from '../ui/Splitter';

const GUTTER = 14;
const COLUMNS = [1.1, 1];
const LEFT_ROWS = [1.25, 0.8, 1];
const RIGHT_ROWS = [1.3, 1];

export function ModernShell({ g }: { g: GameApi }) {
  const { state, hint } = g;
  const [columns, setColumns, resetColumns] = useSizes('modern.columns', COLUMNS);
  const [leftRows, setLeftRows, resetLeft] = useSizes('modern.left', LEFT_ROWS);
  const [rightRows, setRightRows, resetRight] = useSizes('modern.right', RIGHT_ROWS);
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
          <button type="button" className="chip chip-btn" onClick={() => g.openLookup()}>
            <Search size={14} aria-hidden="true" />
            Search records
          </button>
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
      <main className="modern-grid" data-split="" style={{ gridTemplateColumns: tracks(columns, GUTTER) }}>
        <div className="col" data-split="" style={{ gridTemplateRows: tracks(leftRows, GUTTER) }}>
          <UnitStatus g={g} />
          <Splitter axis="y" label="Resize unit status and call queue" fixed={GUTTER * 2} onMove={(d) => setLeftRows((cur) => resizeAt(cur, 0, d))} onReset={resetLeft} />
          <CallQueue g={g} />
          <Splitter axis="y" label="Resize call queue and radio log" fixed={GUTTER * 2} onMove={(d) => setLeftRows((cur) => resizeAt(cur, 1, d))} onReset={resetLeft} />
          <RadioLog g={g} />
        </div>
        <Splitter axis="x" label="Resize the two columns" fixed={GUTTER} onMove={(d) => setColumns((cur) => resizeAt(cur, 0, d))} onReset={resetColumns} />
        <div className="col" data-split="" style={{ gridTemplateRows: tracks(rightRows, GUTTER) }}>
          <ActiveCall g={g} />
          <Splitter axis="y" label="Resize active call and map" fixed={GUTTER} onMove={(d) => setRightRows((cur) => resizeAt(cur, 0, d))} onReset={resetRight} />
          <MapView g={g} />
        </div>
      </main>
      <RecordsSearch g={g} />
      <ScoreCard g={g} />
    </div>
  );
}
