import { answerFor, factQuestions, startingUnits, typeLabel } from '../data/content';
import { chooseScenario, firstScenario } from '../data/scenarios';
import { postalById, postalLabel } from '../data/postals';
import { scoreCall } from './scoring';
import { fullName } from '../data/people';
import { mulberry32 } from '../data/scenarios';
import { patrolRoute, routeToPoint, routeToPostal, stepUnit } from './sim';
import { advanceStops, isOpen } from './stops';
import type {
  Fact,
  Incident,
  IncidentDraft,
  Phase,
  RadioLine,
  Scenario,
  Score,
  Stop,
  StopResult,
  TranscriptLine,
  Unit,
} from './types';

export interface GameState {
  seed: number;
  clock: number;
  phase: Phase;
  callNumber: number;
  scenario: Scenario;
  ringAt: number;
  answeredAt: number | null;
  asked: Fact[];
  transcript: TranscriptLine[];
  typed: number;
  pending: boolean;
  incident: Incident | null;
  units: Unit[];
  radio: RadioLine[];
  score: Score | null;
  stopsOn: boolean;
  stops: Stop[];
  stopResults: StopResult[];
  nextStopAt: number;
  stopCount: number;
}

export const MAX_TYPED = 8;
export const MAX_TYPED_CHARS = 140;

export type Action =
  | { type: 'tick'; dt: number }
  | { type: 'answer' }
  | { type: 'ask'; fact: Fact }
  | { type: 'say'; text: string }
  | { type: 'reply'; call: number; text: string; told: Fact[]; system?: boolean }
  | { type: 'create'; draft: IncidentDraft }
  | { type: 'dispatch'; unitIds: string[] }
  | { type: 'clear' }
  | { type: 'dismiss' }
  | { type: 'stopCopy' }
  | { type: 'stopPlate' }
  | { type: 'stopBackup'; unitIds: string[] }
  | { type: 'next' }
  | { type: 'reset' };

export function initialState(seed = 1, scenario: Scenario = firstScenario(), stopsOn = false): GameState {
  return {
    seed,
    clock: 0,
    phase: 'waiting',
    callNumber: 0,
    scenario,
    ringAt: scenario.ringAfter,
    answeredAt: null,
    asked: [],
    transcript: [],
    typed: 0,
    pending: false,
    incident: null,
    units: startingUnits(),
    radio: [],
    score: null,
    stopsOn,
    stops: [],
    stopResults: [],
    nextStopAt: 35 + Math.floor(mulberry32(seed + 5)() * 30),
    stopCount: 0,
  };
}

function addRadio(state: GameState, from: string, text: string, emergency = false): RadioLine[] {
  const id = state.radio.length ? state.radio[state.radio.length - 1].id + 1 : 1;
  return [...state.radio, { id, t: state.clock, from, text, emergency }];
}

function withRadio(state: GameState, lines: [string, string, boolean?][]): GameState {
  let next = state;
  for (const [from, text, emergency] of lines) {
    next = { ...next, radio: addRadio(next, from, text, emergency) };
  }
  return next;
}

const openStop = (state: GameState) => state.stops.find(isOpen);

function updateStop(state: GameState, id: string, patch: Partial<Stop>): GameState {
  return { ...state, stops: state.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'tick': {
      let next: GameState = { ...state, clock: state.clock + action.dt };
      if (next.phase === 'waiting' && next.clock >= next.ringAt) {
        next = { ...next, phase: 'ringing' };
      }
      const arrivals: string[] = [];
      const units = next.units.map((current) => {
        let u = current;
        if (u.status === 'available' && !u.route.length) {
          const wait = u.wait - action.dt;
          if (wait > 0) {
            u = { ...u, wait };
          } else {
            const route = patrolRoute(u, next.seed, next.clock);
            u = route.length ? { ...u, route, wait: 0 } : { ...u, wait: 2 };
          }
        }
        const res = stepUnit(u, action.dt);
        if (res.arrived) arrivals.push(u.name);
        return res.unit;
      });
      next = { ...next, units };
      next = withRadio(
        next,
        arrivals.map((name): [string, string] => [name, `${name} on scene.`]),
      );
      const out = advanceStops({
        clock: next.clock,
        seed: next.seed,
        enabled: next.stopsOn,
        stops: next.stops,
        units: next.units,
        nextStopAt: next.nextStopAt,
        stopCount: next.stopCount,
      });
      next = {
        ...next,
        stops: out.stops,
        units: out.units,
        nextStopAt: out.nextStopAt,
        stopCount: out.stopCount,
        stopResults: [...next.stopResults, ...out.results],
      };
      return withRadio(next, out.lines);
    }
    case 'stopCopy': {
      const stop = openStop(state);
      if (!stop || stop.ackAt !== null) return state;
      return withRadio(updateStop(state, stop.id, { ackAt: state.clock }), [
        ['DISP', `${stop.unitId}, copy traffic stop, ${stop.plate}, ${stop.vehicle}.`],
        [stop.unitId, `${stop.unitId}, driver gives the name ${fullName(stop.driver)}, date of birth ${stop.driver.dob}.`],
      ]);
    }
    case 'stopPlate': {
      const stop = openStop(state);
      if (!stop || stop.ackAt === null || stop.plateAskedAt !== null) return state;
      return withRadio(updateStop(state, stop.id, { plateAskedAt: state.clock }), [
        ['DISP', `Running plate ${stop.plate} for ${stop.unitId}.`],
      ]);
    }
    case 'stopBackup': {
      const stop = openStop(state);
      if (!stop || stop.ackAt === null) return state;
      const ids = action.unitIds.filter((id) => state.units.some((u) => u.id === id && u.status === 'available'));
      if (!ids.length) return state;
      const target = { x: stop.x, y: stop.y };
      const units = state.units.map((u) =>
        ids.includes(u.id)
          ? { ...u, status: 'enroute' as const, route: routeToPoint(u, target), trail: [{ x: u.x, y: u.y }], wait: 0 }
          : u,
      );
      const next = updateStop({ ...state, units }, stop.id, {
        backupIds: [...stop.backupIds, ...ids],
        backupSentAt: stop.backupSentAt ?? state.clock,
      });
      return withRadio(next, [
        ['DISP', `${ids.join(', ')}, assist ${stop.unitId} at the traffic stop.`],
        ...ids.map((id): [string, string] => [id, `${id} copy, en route.`]),
      ]);
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
      if (state.asked.includes(action.fact) || !state.scenario.questions.includes(action.fact)) return state;
      return {
        ...state,
        asked: [...state.asked, action.fact],
        transcript: [
          ...state.transcript,
          { from: 'you', text: factQuestions[action.fact] },
          { from: 'caller', text: answerFor(state.scenario, action.fact) },
        ],
      };
    }
    case 'say': {
      const text = action.text.trim().slice(0, MAX_TYPED_CHARS);
      if ((state.phase !== 'call' && state.phase !== 'incident') || state.pending || !text) return state;
      if (state.typed >= MAX_TYPED) return state;
      return {
        ...state,
        pending: true,
        typed: state.typed + 1,
        transcript: [...state.transcript, { from: 'you', text }],
      };
    }
    case 'reply': {
      if (action.call !== state.callNumber || (state.phase !== 'call' && state.phase !== 'incident')) return state;
      const asked = [...new Set([...state.asked, ...action.told])];
      return {
        ...state,
        pending: false,
        asked,
        transcript: [...state.transcript, { from: action.system ? 'system' : 'caller', text: action.text }],
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
        ids.includes(u.id)
          ? {
              ...u,
              status: 'enroute' as const,
              route: routeToPostal(u, incident.postal) ?? [],
              trail: [{ x: u.x, y: u.y }],
              wait: 0,
            }
          : u,
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
        dismissedAt: null,
      });
      const units = state.units.map((u) =>
        incident.unitIds.includes(u.id) ? { ...u, status: 'available' as const, route: [], trail: [] } : u,
      );
      return withRadio({ ...state, phase: 'closed', score, units }, [
        ['DISP', `${incident.id} cleared.`],
      ]);
    }
    case 'dismiss': {
      const { incident } = state;
      if ((state.phase !== 'call' && state.phase !== 'incident') || state.answeredAt === null) return state;
      if (incident && incident.dispatchedAt !== null) return state;
      const score = scoreCall({
        scenario: state.scenario,
        ringAt: state.ringAt,
        answeredAt: state.answeredAt,
        asked: state.asked,
        incident,
        units: state.units,
        dismissedAt: state.clock,
      });
      const closed: GameState = { ...state, phase: 'closed', pending: false, score };
      return incident ? withRadio(closed, [['DISP', `${incident.id} closed, no units sent.`]]) : closed;
    }
    case 'next': {
      if (state.phase !== 'closed') return state;
      const callNumber = state.callNumber + 1;
      const scenario = chooseScenario(state.seed, callNumber, state.scenario.id);
      return {
        ...state,
        phase: 'waiting',
        callNumber,
        scenario,
        ringAt: state.clock + scenario.ringAfter,
        answeredAt: null,
        asked: [],
        transcript: [],
        typed: 0,
        pending: false,
        incident: null,
        score: null,
      };
    }
    case 'reset': {
      const seed = state.seed + 1;
      return initialState(seed, chooseScenario(seed, 0, state.scenario.id), state.stopsOn);
    }
    default:
      return state;
  }
}
