import { Check, ClipboardList, Headset, PhoneCall, Send } from 'lucide-react';
import { useState } from 'react';
import { factLabels, factOrder, factQuestions, incidentTypes, priorities } from '../data/content';
import { postalById, postalDetail } from '../data/postals';
import { MAX_TYPED, MAX_TYPED_CHARS } from '../game/state';
import type { GameApi } from '../game/useGame';
import type { IncidentTypeId, Priority } from '../game/types';
import { Panel } from '../ui/Panel';
import { Select } from '../ui/Select';

const typeOptions = incidentTypes.map((t) => ({ value: t.id, label: t.label }));
const priorityOptions = priorities.map((p) => ({ value: p.id, label: p.label }));

function AskBox({ g }: { g: GameApi }) {
  const { state, ai, say } = g;
  const [text, setText] = useState('');
  if (!ai.enabled) return null;

  const used = ai.left === 0 || state.typed >= MAX_TYPED;
  const locked = state.pending || used;
  return (
    <>
      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (locked || !text.trim()) return;
          say(text);
          setText('');
        }}
      >
        <input
          aria-label="Ask the caller"
          placeholder={used ? 'No typed questions left' : 'Ask the caller anything'}
          maxLength={MAX_TYPED_CHARS}
          disabled={locked}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" aria-label="Send question" disabled={locked || !text.trim()}>
          <Send size={14} aria-hidden="true" />
        </button>
      </form>
      <p className="muted ask-meta">
        {state.pending ? 'Caller is answering...' : `${state.typed}/${MAX_TYPED} typed questions this call`}
      </p>
    </>
  );
}

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
      <AskBox g={g} />
      <ul className="checklist">
        {factOrder.filter((f) => scenario.questions.includes(f)).map((f) => (
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
  const [type, setType] = useState<IncidentTypeId | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
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
        if (!found || !type || !priority) return;
        dispatch({ type: 'create', draft: { type, priority, postal: postalNumber, narrative } });
      }}
    >
      <label>
        Type
        <Select value={incident?.type ?? type} options={typeOptions} placeholder="Select a type" disabled={!editable} onChange={setType} />
      </label>
      <label>
        Priority
        <Select value={incident?.priority ?? priority} options={priorityOptions} placeholder="Select a priority" disabled={!editable} onChange={setPriority} />
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
            ? postalDetail(incident.postal)
            : postal === ''
              ? 'Enter the caller postal'
              : found
                ? postalDetail(found.id) || 'Postal found'
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
          <>
            <button type="submit" className="btn primary" disabled={!found || !type || !priority}>
              <ClipboardList size={14} aria-hidden="true" />
              Create incident
            </button>
            <button type="button" className="btn" onClick={() => dispatch({ type: 'dismiss' })}>
              Close without units
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn" disabled={!dispatched} onClick={() => dispatch({ type: 'clear' })}>
              Clear call (F12)
            </button>
            {!dispatched ? (
              <button type="button" className="btn" onClick={() => dispatch({ type: 'dismiss' })}>
                Close without units
              </button>
            ) : null}
          </>
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
