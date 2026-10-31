import { mulberry32 } from '../data/scenarios';
import { postalLabel } from '../data/postals';
import { nearestPostal } from './sim';
import type { Stop, StopOutcome, StopResult, Unit } from './types';

export const PLATE_DELAY = 4;
const REMIND_AFTER = 60;
const ESCALATE_AFTER = 35;
const BACKUP_TIMEOUT = 120;
const NO_PLATE_TIMEOUT = 130;
const LEAVE_AFTER_BACKUP = 8;

const colors = ['white', 'black', 'silver', 'red', 'blue', 'grey', 'green', 'tan'];
const bodies = ['sedan', 'pickup truck', 'SUV', 'hatchback', 'coupe', 'van'];

const outcomeWeights: [StopOutcome, number][] = [
  ['routine', 45],
  ['expired', 25],
  ['warrant', 12],
  ['stolen', 10],
  ['felony', 8],
];

const readout: Record<StopOutcome, string> = {
  routine: 'valid, registered to a local owner, no wants or warrants',
  expired: 'registration expired two months ago, otherwise valid',
  warrant: 'registered owner has an active warrant for failure to appear',
  stolen: 'reported stolen yesterday',
  felony: 'matches a vehicle linked to an armed robbery, use extreme caution',
};

const backupReason: Record<StopOutcome, string> = {
  routine: '',
  expired: '',
  warrant: 'driver is the owner with a warrant',
  stolen: 'vehicle is reported stolen',
  felony: 'possible armed felony suspect',
};

export const needsBackup = (outcome: StopOutcome) => outcome === 'warrant' || outcome === 'stolen' || outcome === 'felony';
export const backupNeeded = (outcome: StopOutcome) => (outcome === 'felony' ? 2 : needsBackup(outcome) ? 1 : 0);
export const isOpen = (stop: Stop) => stop.closedAt === null;
export const stopWhere = (stop: Pick<Stop, 'postal'>) => postalLabel(stop.postal);

export function makeStop(seed: number, n: number, clock: number, unit: Unit): Stop {
  const rand = mulberry32(seed * 31 + n * 7919);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(rand() * 26))).join('');
  const digits = String(100 + Math.floor(rand() * 900));

  const total = outcomeWeights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  let outcome: StopOutcome = 'routine';
  for (const [o, w] of outcomeWeights) {
    if (roll < w) {
      outcome = o;
      break;
    }
    roll -= w;
  }

  return {
    id: `TS-${n}`,
    unitId: unit.id,
    x: unit.x,
    y: unit.y,
    postal: nearestPostal(unit.x, unit.y) ?? 0,
    vehicle: `${pick(colors)} ${pick(bodies)}`,
    plate: `${letters}${digits}`,
    outcome,
    startedAt: clock,
    duration: 50 + Math.floor(rand() * 30),
    ackAt: null,
    plateAskedAt: null,
    plateAt: null,
    plateResult: null,
    backupAskedAt: null,
    backupIds: [],
    backupSentAt: null,
    backupArrivedAt: null,
    reminded: false,
    escalated: false,
    closedAt: null,
  };
}

export function scoreStop(stop: Stop, failed: boolean): StopResult {
  const notes: string[] = [];
  let total = 0;

  if (stop.ackAt === null) {
    notes.push('You never copied the stop.');
  } else {
    const wait = stop.ackAt - stop.startedAt;
    total += wait <= 8 ? 20 : wait <= 15 ? 12 : 5;
    notes.push(`Copied after ${Math.round(wait)}s.`);
  }

  if (stop.plateAskedAt === null) {
    notes.push('The plate was never run.');
  } else {
    const wait = stop.plateAskedAt - stop.startedAt;
    total += wait <= 20 ? 30 : wait <= 40 ? 20 : 10;
    notes.push(`Plate run after ${Math.round(wait)}s.`);
  }

  const needed = backupNeeded(stop.outcome);
  if (needed === 0) {
    if (stop.backupIds.length === 0) {
      total += 50;
      notes.push('Backup was not needed and none was sent.');
    } else {
      notes.push(`Backup was not needed, ${stop.backupIds.length} units were sent anyway.`);
    }
  } else if (stop.backupIds.length === 0) {
    notes.push(`The plate was ${stop.outcome === 'felony' ? 'a felony hit' : stop.outcome}, backup was needed and none came.`);
  } else {
    const wait = stop.backupSentAt !== null && stop.backupAskedAt !== null ? stop.backupSentAt - stop.backupAskedAt : Infinity;
    const enough = stop.backupIds.length >= needed;
    total += enough ? (wait <= 30 ? 50 : 35) : 20;
    notes.push(
      enough ? `Backup sent ${Number.isFinite(wait) ? Math.round(wait) : '?'}s after the request.` : `${needed} units were needed, you sent ${stop.backupIds.length}.`,
    );
  }

  if (failed) notes.push('The officer was left without help too long.');
  return { id: stop.id, unitId: stop.unitId, total, notes };
}

type Line = [string, string, boolean?];

interface Input {
  clock: number;
  seed: number;
  enabled: boolean;
  stops: Stop[];
  units: Unit[];
  nextStopAt: number;
  stopCount: number;
}

export interface Output {
  stops: Stop[];
  units: Unit[];
  lines: Line[];
  results: StopResult[];
  nextStopAt: number;
  stopCount: number;
}

export function advanceStops(input: Input): Output {
  const { clock, seed, enabled } = input;
  let { stops, units, nextStopAt, stopCount } = input;
  const lines: Line[] = [];
  const results: StopResult[] = [];

  if (enabled && clock >= nextStopAt && !stops.some(isOpen)) {
    const free = units.filter((u) => u.status === 'available');
    if (!free.length) {
      nextStopAt = clock + 10;
    } else {
      stopCount += 1;
      const unit = free[Math.floor(mulberry32(seed + stopCount * 101)() * free.length)];
      const stop = makeStop(seed, stopCount, clock, unit);
      stops = [...stops, stop];
      units = units.map((u) => (u.id === unit.id ? { ...u, status: 'onstop', route: [], trail: [], wait: 0 } : u));
      nextStopAt = Infinity;
      lines.push([unit.name, `${unit.name} to dispatch, traffic stop at ${stopWhere(stop)}, ${stop.vehicle}, plate ${stop.plate}. Run that plate for me.`]);
    }
  }

  const closing: { stop: Stop; failed: boolean }[] = [];
  stops = stops.map((stop) => {
    if (!isOpen(stop)) return stop;
    let s = stop;
    const age = clock - s.startedAt;
    const needed = backupNeeded(s.outcome);

    if (s.plateAskedAt !== null && s.plateResult === null && clock >= s.plateAskedAt + PLATE_DELAY) {
      s = { ...s, plateResult: readout[s.outcome], plateAt: clock };
      lines.push(['DISP', `${s.unitId}, plate ${s.plate} returns ${readout[s.outcome]}.`]);
      if (needed > 0) {
        s = { ...s, backupAskedAt: clock };
        lines.push([s.unitId, `${s.unitId} copy, request ${needed > 1 ? 'two units' : 'a unit'} for backup at the stop, ${backupReason[s.outcome]}.`, true]);
      }
    }

    if (needed > 0 && s.plateAskedAt === null && age > REMIND_AFTER && !s.reminded) {
      s = { ...s, reminded: true };
      lines.push([s.unitId, `${s.unitId} to dispatch, did you get that plate?`]);
    }

    if (needed > 0 && s.backupAskedAt !== null && s.backupIds.length < needed && clock > s.backupAskedAt + ESCALATE_AFTER && !s.escalated) {
      s = { ...s, escalated: true };
      lines.push([s.unitId, `${s.unitId} I need that backup now!`, true]);
    }

    const arrived = units.filter((u) => u.status === 'onscene' && s.backupIds.includes(u.id)).length;
    if (needed > 0 && s.backupArrivedAt === null && arrived >= needed) s = { ...s, backupArrivedAt: clock };

    let close = false;
    let failed = false;
    if (needed === 0) {
      close = age >= s.duration;
    } else if (s.backupArrivedAt !== null) {
      close = clock >= s.backupArrivedAt + LEAVE_AFTER_BACKUP;
    } else if (s.backupAskedAt !== null ? clock > s.backupAskedAt + BACKUP_TIMEOUT : age > NO_PLATE_TIMEOUT) {
      close = true;
      failed = true;
    }
    if (close) closing.push({ stop: s, failed });
    return s;
  });

  for (const { stop, failed } of closing) {
    const result = scoreStop(stop, failed);
    results.push(result);
    stops = stops.map((s) => (s.id === stop.id ? { ...s, closedAt: clock } : s));
    units = units.map((u) => {
      if (u.id === stop.unitId || stop.backupIds.includes(u.id)) return { ...u, status: 'available', route: [], trail: [], wait: 0.5 };
      return u;
    });
    lines.push([stop.unitId, `${stop.unitId} clear of the traffic stop.`]);
    lines.push(['DISP', `${stop.id} closed, score ${result.total}/100.`]);
    nextStopAt = clock + 50 + Math.floor(mulberry32(seed + stopCount * 211)() * 60);
  }

  return { stops, units, lines, results, nextStopAt, stopCount };
}
