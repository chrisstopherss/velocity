import { CheckCircle2, ClipboardList, GraduationCap, PhoneCall, Search, Send } from 'lucide-react';
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

const GUTTER = 6;
const COLUMNS = [1.6, 1.7, 1];
const ROWS = [1.2, 1];

export function ClassicShell({ g }: { g: GameApi }) {
  const { state, dispatch, selected, sendSelected, hint } = g;
  const { phase, incident } = state;
  const [columns, setColumns, resetColumns] = useSizes('classic.columns', COLUMNS);
  const [rows, setRows, resetRows] = useSizes('classic.rows', ROWS);
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
        <button type="button" onClick={() => g.openLookup()}>
          <em>F3</em>
          <Search size={24} aria-hidden="true" />
          Records
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

      <main
        className="classic-grid"
        data-split=""
        style={{ gridTemplateColumns: tracks(columns, GUTTER), gridTemplateRows: tracks(rows, GUTTER) }}
      >
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
        <div className="area-split-a">
          <Splitter axis="x" label="Resize units and map" fixed={GUTTER * 2} onMove={(d) => setColumns((cur) => resizeAt(cur, 0, d))} onReset={resetColumns} />
        </div>
        <div className="area-split-b">
          <Splitter axis="x" label="Resize map and radio log" fixed={GUTTER * 2} onMove={(d) => setColumns((cur) => resizeAt(cur, 1, d))} onReset={resetColumns} />
        </div>
        <div className="area-split-row">
          <Splitter axis="y" label="Resize the top and bottom panels" fixed={GUTTER} onMove={(d) => setRows((cur) => resizeAt(cur, 0, d))} onReset={resetRows} />
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
      <RecordsSearch g={g} />
      <ScoreCard g={g} />
    </div>
  );
}
