import { factOrder } from '../data/content';
import { postalById } from '../data/postals';
import type { Fact, Incident, Scenario, Score, ScoreLine, Unit } from './types';

interface ScoreInput {
  scenario: Scenario;
  ringAt: number;
  answeredAt: number;
  asked: Fact[];
  incident: Incident | null;
  units: Unit[];
  dismissedAt: number | null;
}

function pointsByThreshold(value: number, steps: [number, number][], fallback: number): number {
  for (const [limit, pts] of steps) {
    if (value <= limit) return pts;
  }
  return fallback;
}

const NO_INCIDENT = 'No incident was logged.';

export function scoreCall(input: ScoreInput): Score {
  const { scenario, ringAt, answeredAt, asked, incident, units, dismissedAt } = input;
  const truth = scenario.truth;
  const needsUnits = truth.minUnits > 0;
  const falseReport = truth.type === 'false_report';
  const lines: ScoreLine[] = [];

  const answerWait = answeredAt - ringAt;
  const answerPts = pointsByThreshold(answerWait, [[8, 10], [15, 6]], 2);
  lines.push({ label: 'Answer time', points: answerPts, max: 10, note: `Answered after ${Math.round(answerWait)}s.` });

  const relevant = factOrder.filter((f) => scenario.questions.includes(f));
  const got = relevant.filter((f) => asked.includes(f));
  const missing = relevant.filter((f) => !asked.includes(f));
  lines.push({
    label: 'Information gathered',
    points: Math.round((got.length / relevant.length) * 30),
    max: 30,
    note: missing.length ? `Not asked: ${missing.join(', ')}.` : 'You covered every question.',
  });

  const typeOk = incident?.type === truth.type;
  lines.push({
    label: 'Incident type',
    points: typeOk ? 10 : 0,
    max: 10,
    note: !incident
      ? NO_INCIDENT
      : typeOk
        ? falseReport
          ? 'Right call, this was not a real emergency.'
          : 'Correct type.'
        : falseReport
          ? 'This turned out not to be a real emergency.'
          : 'The caller described a different type of call.',
  });

  const gap = incident ? Math.abs(incident.priority - truth.priority) : null;
  lines.push({
    label: 'Priority',
    points: gap === null ? 0 : gap === 0 ? 10 : gap === 1 ? 5 : 0,
    max: 10,
    note: gap === null ? NO_INCIDENT : gap === 0 ? 'Right priority.' : `Priority ${truth.priority} was expected.`,
  });

  const street = postalById.get(truth.postal)?.street;
  const placeOk = incident?.postal === truth.postal;
  lines.push({
    label: 'Location',
    points: falseReport || placeOk ? 20 : 0,
    max: 20,
    note: falseReport
      ? 'No location was needed for a false report.'
      : !incident
        ? NO_INCIDENT
        : placeOk
          ? 'Correct postal.'
          : `The caller was at postal ${truth.postal}${street ? ` on ${street}` : ''}.`,
  });

  const sent = units.filter((u) => incident?.unitIds.includes(u.id));
  if (needsUnits) {
    const agencyOk = sent.some((u) => truth.agencies.includes(u.agency));
    const enough = sent.length >= truth.minUnits;
    lines.push({
      label: 'Unit choice',
      points: (enough ? 6 : sent.length ? 2 : 0) + (agencyOk ? 4 : 0),
      max: 10,
      note: enough ? `${sent.length} units sent.` : `${truth.minUnits} units were needed, you sent ${sent.length}.`,
    });
  } else {
    lines.push({
      label: 'Unit choice',
      points: sent.length ? 0 : 10,
      max: 10,
      note: sent.length ? `${sent.length} units were sent but none were needed.` : 'No units were needed and none were sent.',
    });
  }

  const decidedAt = needsUnits ? (incident?.dispatchedAt ?? null) : (dismissedAt ?? incident?.dispatchedAt ?? null);
  const wait = decidedAt === null ? Infinity : decidedAt - answeredAt;
  lines.push({
    label: needsUnits ? 'Time to dispatch' : 'Time to decide',
    points: pointsByThreshold(wait, [[60, 10], [120, 6]], 2),
    max: 10,
    note: Number.isFinite(wait)
      ? needsUnits
        ? `Dispatched ${Math.round(wait)}s after answering.`
        : `Decided ${Math.round(wait)}s after answering.`
      : needsUnits
        ? 'No units were sent.'
        : 'No decision was made.',
  });

  const reveal = needsUnits
    ? `This call was: ${scenario.label}.`
    : `This call was: ${scenario.label}. No response was needed.`;
  return { total: lines.reduce((sum, l) => sum + l.points, 0), reveal, lines };
}
