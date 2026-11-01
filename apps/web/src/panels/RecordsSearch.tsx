import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { plateText, type Person, type Vehicle } from '../data/people';
import { search } from '../game/records';
import type { GameApi } from '../game/useGame';
import { PersonRecord, VehicleRecord } from './Records';

type Pick = { kind: 'person'; item: Person } | { kind: 'vehicle'; item: Vehicle };

const keyOf = (row: Pick) => (row.kind === 'person' ? `p-${row.item.id}` : `v-${row.item.plate}`);

function personFlag(p: Person) {
  if (p.warrant) return <span className="bad">Active warrant</span>;
  if (p.status === 'suspended') return <span className="warn">Licence suspended</span>;
  if (p.alert) return <span className="warn">Alert on file</span>;
  if (p.caution) return <span className="warn">Officer safety caution</span>;
  return <span className="ok">No wants</span>;
}

function vehicleFlag(v: Vehicle) {
  if (v.status === 'stolen') return <span className="bad">Stolen vehicle</span>;
  if (v.status === 'expired') return <span className="warn">Registration expired</span>;
  if (!v.insured) return <span className="warn">No insurance on file</span>;
  return <span className="ok">Registration valid</span>;
}

export function RecordsSearch({ g }: { g: GameApi }) {
  const { lookup, records, closeLookup, setQuery } = g;
  const input = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState(0);
  const [forced, setForced] = useState<Pick | null>(null);

  const results = useMemo(() => search(records, lookup.query), [records, lookup.query]);
  const rows: Pick[] = [
    ...results.people.map((item): Pick => ({ kind: 'person', item })),
    ...results.vehicles.map((item): Pick => ({ kind: 'vehicle', item })),
  ];
  const current = forced ?? rows[Math.min(index, rows.length - 1)] ?? null;
  const currentKey = current ? keyOf(current) : '';

  useEffect(() => {
    if (lookup.open) input.current?.focus();
  }, [lookup.open]);

  useEffect(() => {
    setIndex(0);
    setForced(null);
  }, [lookup.query]);

  if (!lookup.open) return null;

  const move = (e: React.KeyboardEvent, step: number) => {
    e.preventDefault();
    setForced(null);
    setIndex((i) => Math.max(0, Math.min(i + step, rows.length - 1)));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLookup();
    else if (e.key === 'ArrowDown') move(e, 1);
    else if (e.key === 'ArrowUp') move(e, -1);
  };

  const short = lookup.query.trim().length < 2;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Records search" onKeyDown={onKey} onMouseDown={(e) => e.target === e.currentTarget && closeLookup()}>
      <div className="records">
        <header className="records-bar">
          <Search size={16} aria-hidden="true" />
          <input
            ref={input}
            value={lookup.query}
            placeholder="Name, plate, date of birth or licence number"
            aria-label="Search records"
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="icon-btn" aria-label="Close search" onClick={closeLookup}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="records-body">
          <div className="records-list" role="listbox" aria-label="Results">
            {short ? <p className="empty">Type a name, a plate or a date of birth.</p> : null}
            {!short && rows.length === 0 ? <p className="empty">No records found.</p> : null}
            {results.people.length ? <h4>People</h4> : null}
            {results.people.map((p) => {
              const row: Pick = { kind: 'person', item: p };
              const on = keyOf(row) === currentKey;
              return (
                <button key={p.id} type="button" role="option" aria-selected={on} className={`res${on ? ' on' : ''}`} onClick={() => setForced(row)}>
                  <span>
                    {p.last}, {p.first} {p.middle}, {p.dob.slice(-4)}
                  </span>
                  {personFlag(p)}
                </button>
              );
            })}
            {results.vehicles.length ? <h4>Vehicles</h4> : null}
            {results.vehicles.map((v) => {
              const row: Pick = { kind: 'vehicle', item: v };
              const on = keyOf(row) === currentKey;
              return (
                <button key={v.plate} type="button" role="option" aria-selected={on} className={`res${on ? ' on' : ''}`} onClick={() => setForced(row)}>
                  <span>
                    <span className="mono">{plateText(v.plate)}</span>, {v.year} {v.make} {v.model}
                  </span>
                  {vehicleFlag(v)}
                </button>
              );
            })}
          </div>
          <div className="records-view">
            {current?.kind === 'person' ? (
              <PersonRecord person={current.item} records={records} onVehicle={(v) => setForced({ kind: 'vehicle', item: v })} />
            ) : current?.kind === 'vehicle' ? (
              <VehicleRecord vehicle={current.item} records={records} onPerson={(p) => setForced({ kind: 'person', item: p })} />
            ) : (
              <p className="empty">Pick a result to see the record.</p>
            )}
          </div>
        </div>
        <footer className="records-foot">
          <span className="muted">Up and Down to move, Esc to close.</span>
        </footer>
      </div>
    </div>
  );
}
