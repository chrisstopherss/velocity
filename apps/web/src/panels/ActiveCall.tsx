import { Check, ClipboardList, Headset, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { factLabels, factOrder, factQuestions, incidentTypes, priorities } from '../data/content';
import { postalById } from '../data/postals';
import type { GameApi } from '../game/useGame';
import type { IncidentTypeId, Priority } from '../game/types';
import { Panel } from '../ui/Panel';
import { Select } from '../ui/Select';

const typeOptions = incidentTypes.map((t) => ({ value: t.id, label: t.label }));
const priorityOptions = priorities.map((p) => ({ value: p.id, label: p.label }));

function CallTaker({ g }: { g: GameApi }) {
  const { state, dispatch } = g;
  const { phase, transcript, asked, scenario } = state;

  if (phase === 'waiting' || phase === 'closed') {
    return <p className="empty">No active call. Stay ready.</p>;
  }
  if (phase === 'ringing') {
    return (
      <div className="ringing">
        <PhoneCall size={28} className="ring-icon" aria-hidden="true" />
        <div>
          <strong>Incoming 911</strong>
          <p className="muted">Press F1 or answer now.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => dispatch({ type: 'answer' })}>
          Answer
        </button>
      </div>
    );
  }

  const canAsk = phase === 'call' || phase === 'incident';
  return (
    <div className="taker">
      <div className="caller">
        <Headset size={14} aria-hidden="true" /> {scenario.caller}
      </div>
      <div className="transcript" aria-live="polite">
        {transcript.map((t, i) => (
          <p key={i} className={t.from}>
            {t.text}
          </p>
        ))}
      </div>
      <ul className="checklist">
        {factOrder.map((f) => (
          <li key={f}>
            <button
              type="button"
              className={asked.includes(f) ? 'done' : ''}
              disabled={!canAsk || asked.includes(f)}
              title={factQuestions[f]}
              onClick={() => dispatch({ type: 'ask', fact: f })}
            >
              {asked.includes(f) ? <Check size={13} aria-hidden="true" /> : null}
              {factLabels[f]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IncidentForm({ g }: { g: GameApi }) {
  const { state, dispatch } = g;
  const { phase, incident } = state;
  const [type, setType] = useState<IncidentTypeId>('suspicious_vehicle');
  const [priority, setPriority] = useState<Priority>(3);
  const [postal, setPostal] = useState('');
  const [narrative, setNarrative] = useState('');

  const postalNumber = Number(postal);
  const found = postal !== '' ? postalById.get(postalNumber) : undefined;
  const editable = phase === 'call';
  const dispatched = incident?.dispatchedAt !== null && incident?.dispatchedAt !== undefined;

  if (phase === 'waiting' || phase === 'ringing' || phase === 'closed') {
    return <p className="empty">The incident form opens when you answer a call.</p>;
  }

  return (
    <form
      className="incident-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!found) return;
        dispatch({ type: 'create', draft: { type, priority, postal: postalNumber, narrative } });
      }}
    >
      <label>
        Type
        <Select value={incident?.type ?? type} options={typeOptions} disabled={!editable} onChange={setType} />
      </label>
      <label>
        Priority
        <Select value={incident?.priority ?? priority} options={priorityOptions} disabled={!editable} onChange={setPriority} />
      </label>
      <label>
        Postal
        <input
          inputMode="numeric"
          placeholder="e.g. 322"
          disabled={!editable}
          value={incident ? String(incident.postal) : postal}
          onChange={(e) => setPostal(e.target.value.replace(/\D/g, ''))}
        />
        <span className={`lookup ${found || incident ? 'ok' : ''}`}>
          {incident
            ? postalById.get(incident.postal)?.street ?? ''
            : postal === ''
              ? 'Enter the caller postal'
              : found
                ? found.street ?? 'Postal found'
                : 'Postal not found'}
        </span>
      </label>
      <label className="wide">
        Narrative
        <textarea
          rows={3}
          disabled={!editable}
          value={incident?.narrative ?? narrative}
          onChange={(e) => setNarrative(e.target.value)}
        />
      </label>
      <div className="form-actions wide">
        {phase === 'call' ? (
          <button type="submit" className="btn primary" disabled={!found}>
            <ClipboardList size={14} aria-hidden="true" />
            Create incident
          </button>
        ) : (
          <button type="button" className="btn" disabled={!dispatched} onClick={() => dispatch({ type: 'clear' })}>
            Clear call (F12)
          </button>
        )}
      </div>
    </form>
  );
}

export function ActiveCall({ g }: { g: GameApi }) {
  return (
    <Panel
      title={g.state.incident ? `Active call ${g.state.incident.id}` : 'Active call'}
      icon={<Headset size={16} aria-hidden="true" />}
      className="panel-call"
    >
      <div className="call-grid">
        <CallTaker g={g} />
        <IncidentForm key={g.state.callNumber} g={g} />
      </div>
    </Panel>
  );
}
