import { factOrder } from '../data/content';
import { postalById } from '../data/postals';
import type { Fact, Incident, Scenario, Score, ScoreLine, Unit } from './types';

interface ScoreInput {
  scenario: Scenario;
  ringAt: number;
  answeredAt: number;
  asked: Fact[];
  incident: Incident;
  units: Unit[];
}

function pointsByThreshold(value: number, steps: [number, number][], fallback: number): number {
  for (const [limit, pts] of steps) {
    if (value <= limit) return pts;
  }
  return fallback;
}

export function scoreCall(input: ScoreInput): Score {
  const { scenario, ringAt, answeredAt, asked, incident, units } = input;
  const truth = scenario.truth;
  const lines: ScoreLine[] = [];

  const answerWait = answeredAt - ringAt;
  const answerPts = pointsByThreshold(answerWait, [[8, 10], [15, 6]], 2);
  lines.push({ label: 'Answer time', points: answerPts, max: 10, note: `Answered after ${Math.round(answerWait)}s.` });

  const got = factOrder.filter((f) => asked.includes(f));
  const missing = factOrder.filter((f) => !asked.includes(f));
  lines.push({
    label: 'Information gathered',
    points: got.length * 5,
    max: 30,
    note: missing.length ? `Not asked: ${missing.join(', ')}.` : 'You covered every question.',
  });

  lines.push({
    label: 'Incident type',
    points: incident.type === truth.type ? 10 : 0,
    max: 10,
    note: incident.type === truth.type ? 'Correct type.' : 'The caller described a different type of call.',
  });

  const gap = Math.abs(incident.priority - truth.priority);
  lines.push({
    label: 'Priority',
    points: gap === 0 ? 10 : gap === 1 ? 5 : 0,
    max: 10,
    note: gap === 0 ? 'Right priority.' : `Priority ${truth.priority} was expected.`,
  });

  const street = postalById.get(truth.postal)?.street;
  lines.push({
    label: 'Location',
    points: incident.postal === truth.postal ? 20 : 0,
    max: 20,
    note:
      incident.postal === truth.postal
        ? 'Correct postal.'
        : `The caller was at postal ${truth.postal}${street ? ` on ${street}` : ''}.`,
  });

  const sent = units.filter((u) => incident.unitIds.includes(u.id));
  const agencyOk = sent.some((u) => truth.agencies.includes(u.agency));
  const enough = sent.length >= truth.minUnits;
  lines.push({
    label: 'Unit choice',
    points: (enough ? 6 : sent.length ? 2 : 0) + (agencyOk ? 4 : 0),
    max: 10,
    note: enough ? `${sent.length} units sent.` : `${truth.minUnits} units were needed, you sent ${sent.length}.`,
  });

  const dispatchWait = incident.dispatchedAt === null ? Infinity : incident.dispatchedAt - answeredAt;
  lines.push({
    label: 'Time to dispatch',
    points: pointsByThreshold(dispatchWait, [[60, 10], [120, 6]], 2),
    max: 10,
    note: Number.isFinite(dispatchWait) ? `Dispatched ${Math.round(dispatchWait)}s after answering.` : 'No units were sent.',
  });

  return { total: lines.reduce((sum, l) => sum + l.points, 0), lines };
}
