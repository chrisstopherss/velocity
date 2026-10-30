import { factQuestions, scenarios, startingUnits, typeLabel } from '../data/content';
import { postalById, postalLabel } from '../data/postals';
import { scoreCall } from './scoring';
import { stepUnit } from './sim';
import type {
  Fact,
  Incident,
  IncidentDraft,
  Phase,
  RadioLine,
  Scenario,
  Score,
  TranscriptLine,
  Unit,
} from './types';

export interface GameState {
  clock: number;
  phase: Phase;
  callNumber: number;
  scenario: Scenario;
  ringAt: number;
  answeredAt: number | null;
  asked: Fact[];
  transcript: TranscriptLine[];
  incident: Incident | null;
  units: Unit[];
  radio: RadioLine[];
  score: Score | null;
}

export type Action =
  | { type: 'tick'; dt: number }
  | { type: 'answer' }
  | { type: 'ask'; fact: Fact }
  | { type: 'create'; draft: IncidentDraft }
  | { type: 'dispatch'; unitIds: string[] }
  | { type: 'clear' }
  | { type: 'next' }
  | { type: 'reset' };

export function initialState(): GameState {
  const scenario = scenarios[0];
  return {
    clock: 0,
    phase: 'waiting',
    callNumber: 0,
    scenario,
    ringAt: scenario.ringAfter,
    answeredAt: null,
    asked: [],
    transcript: [],
    incident: null,
    units: startingUnits(),
    radio: [],
    score: null,
  };
}

function addRadio(state: GameState, from: string, text: string, emergency = false): RadioLine[] {
  const id = state.radio.length ? state.radio[state.radio.length - 1].id + 1 : 1;
  return [...state.radio, { id, t: state.clock, from, text, emergency }];
}

function withRadio(state: GameState, lines: [string, string][]): GameState {
  let next = state;
  for (const [from, text] of lines) {
    next = { ...next, radio: addRadio(next, from, text) };
  }
  return next;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'tick': {
      let next: GameState = { ...state, clock: state.clock + action.dt };
      if (next.phase === 'waiting' && next.clock >= next.ringAt) {
        next = { ...next, phase: 'ringing' };
      }
      const arrivals: string[] = [];
      const units = next.units.map((u) => {
        const res = stepUnit(u, action.dt);
        if (res.arrived) arrivals.push(u.name);
        return res.unit;
      });
      next = { ...next, units };
      return withRadio(
        next,
        arrivals.map((name): [string, string] => [name, `${name} on scene.`]),
      );
    }
    case 'answer': {
      if (state.phase !== 'ringing') return state;
      return {
        ...state,
        phase: 'call',
        answeredAt: state.clock,
        transcript: [
          { from: 'you', text: '911, what is the address of your emergency?' },
          { from: 'caller', text: state.scenario.opening },
        ],
      };
    }
    case 'ask': {
      if (state.phase !== 'call' && state.phase !== 'incident') return state;
      if (state.asked.includes(action.fact)) return state;
      return {
        ...state,
        asked: [...state.asked, action.fact],
        transcript: [
          ...state.transcript,
          { from: 'you', text: factQuestions[action.fact] },
          { from: 'caller', text: state.scenario.answers[action.fact] },
        ],
      };
    }
    case 'create': {
      if (state.phase !== 'call') return state;
      const { draft } = action;
      if (!postalById.has(draft.postal)) return state;
      const incident: Incident = {
        id: `C-${String(1000 + state.callNumber + 1)}`,
        type: draft.type,
        priority: draft.priority,
        postal: draft.postal,
        narrative: draft.narrative.trim(),
        createdAt: state.clock,
        unitIds: [],
        dispatchedAt: null,
      };
      return { ...state, phase: 'incident', incident };
    }
    case 'dispatch': {
      const { incident } = state;
      if (state.phase !== 'incident' || !incident) return state;
      const target = postalById.get(incident.postal);
      if (!target) return state;
      const ids = action.unitIds.filter((id) => state.units.some((u) => u.id === id && u.status === 'available'));
      if (!ids.length) return state;
      const units = state.units.map((u) =>
        ids.includes(u.id) ? { ...u, status: 'enroute' as const, targetX: target.x, targetY: target.y } : u,
      );
      let next: GameState = {
        ...state,
        units,
        incident: {
          ...incident,
          unitIds: [...incident.unitIds, ...ids],
          dispatchedAt: incident.dispatchedAt ?? state.clock,
        },
      };
      const where = postalLabel(incident.postal);
      next = withRadio(next, [
        ['DISP', `${ids.join(', ')}, respond to ${typeLabel(incident.type).toLowerCase()}, postal ${where}.`],
        ...ids.map((id): [string, string] => [id, `${id} copy, en route.`]),
      ]);
      return next;
    }
    case 'clear': {
      const { incident } = state;
      if (state.phase !== 'incident' || !incident || incident.dispatchedAt === null || state.answeredAt === null) {
        return state;
      }
      const score = scoreCall({
        scenario: state.scenario,
        ringAt: state.ringAt,
        answeredAt: state.answeredAt,
        asked: state.asked,
        incident,
        units: state.units,
      });
      const units = state.units.map((u) =>
        incident.unitIds.includes(u.id) ? { ...u, status: 'available' as const, targetX: null, targetY: null } : u,
      );
      return withRadio({ ...state, phase: 'closed', score, units }, [
        ['DISP', `${incident.id} cleared.`],
      ]);
    }
    case 'next': {
      if (state.phase !== 'closed') return state;
      const callNumber = state.callNumber + 1;
      const scenario = scenarios[callNumber % scenarios.length];
      return {
        ...state,
        phase: 'waiting',
        callNumber,
        scenario,
        ringAt: state.clock + scenario.ringAfter,
        answeredAt: null,
        asked: [],
        transcript: [],
        incident: null,
        score: null,
      };
    }
    case 'reset':
      return initialState();
    default:
      return state;
  }
}
