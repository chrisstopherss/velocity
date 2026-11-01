import { fullName, makePerson, makeVehicle, makeWarrant, dateText, TODAY } from '../data/people';
import { mulberry32 } from '../data/scenarios';
import { postalLabel } from '../data/postals';
import { etaSeconds, nearestPostal } from './sim';
import type { Stop, StopOutcome, StopResult, Unit } from './types';

export const PLATE_DELAY = 4;
const REMIND_AFTER = 60;
const ESCALATE_AFTER = 35;
const BACKUP_TIMEOUT = 120;
const NO_PLATE_TIMEOUT = 130;
const LEAVE_AFTER_BACKUP = 8;
export const CONFIRM_DELAY = 6;
const FALSE_HIT_CHANCE = 0.3;


const outcomeWeights: [StopOutcome, number][] = [
  ['routine', 45],
  ['expired', 25],
  ['warrant', 12],
  ['stolen', 10],
  ['felony', 8],
];

const readout: Record<StopOutcome, string> = {
  routine: 'registration valid, no wants or warrants',
  expired: 'registration expired two months ago, otherwise valid',
  warrant: 'registered owner has an active warrant',
  stolen: 'reported stolen yesterday, hit not confirmed',
  felony: 'matches a vehicle linked to an armed robbery, hit not confirmed, use extreme caution',
};

const confirmed: Record<StopOutcome, string> = {
  routine: '',
  expired: '',
  warrant: 'the warrant is active',
  stolen: 'the vehicle is stolen',
  felony: 'the vehicle is linked to an armed robbery, use extreme caution',
};

const plateLine = (stop: Stop) =>
  `${stop.car.year} ${stop.car.make} ${stop.car.model}, ${stop.car.color}, registered to ${fullName(stop.owner)}, ${readout[stop.outcome]}`;

const backupReason: Record<StopOutcome, string> = {
  routine: '',
  expired: '',
  warrant: 'driver is the owner with a warrant',
  stolen: 'vehicle is reported stolen',
  felony: 'possible armed felony suspect',
};

export const needsBackup = (outcome: StopOutcome) => outcome === 'warrant' || outcome === 'stolen' || outcome === 'felony';
export const backupNeeded = (outcome: StopOutcome) => (outcome === 'felony' ? 2 : needsBackup(outcome) ? 1 : 0);
export function nearestAvailable(units: Unit[], postal: number, count: number): string[] {
  return units
    .filter((u) => u.status === 'available')
    .map((u) => ({ id: u.id, eta: etaSeconds(u, postal) ?? Infinity }))
    .sort((a, b) => a.eta - b.eta)
    .slice(0, count)
    .map((u) => u.id);
}

export const stillNeeded = (stop: Stop) => Math.max(1, backupNeeded(stop.outcome) - stop.backupIds.length);
export const needsConfirm = (outcome: StopOutcome) => needsBackup(outcome);
export const isOpen = (stop: Stop) => stop.closedAt === null;
export const stopWhere = (stop: Pick<Stop, 'postal'>) => postalLabel(stop.postal);

export function makeStop(seed: number, n: number, clock: number, unit: Unit): Stop {
  const rand = mulberry32(seed * 31 + n * 7919);

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

  const hit = outcome === 'stolen' || outcome === 'felony';
  const driver = makePerson(rand, 1000 + n * 2);
  const owner = hit ? makePerson(rand, 1001 + n * 2) : driver;
  const car = makeVehicle(rand, owner.id);

  if (outcome === 'expired') {
    const lapsed = new Date(TODAY.getTime() - 62 * 86400000);
    car.status = 'expired';
    car.expires = dateText(lapsed);
  } else {
    car.status = hit ? 'stolen' : 'valid';
    if (!hit) car.expires = dateText(new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), 1));
  }
  if (hit) car.reportedBy = 'Liberty County Sheriff';
  if (outcome === 'routine' || outcome === 'expired') {
    driver.warrant = null;
    driver.status = 'valid';
    driver.suspendedFor = null;
  }
  if (outcome === 'warrant') driver.warrant = makeWarrant(rand);
  if (outcome === 'felony') {
    driver.warrant = { offence: 'Armed robbery', court: 'Liberty County Superior Court', bond: 25000, extradition: 'Statewide' };
    driver.caution = 'Armed and dangerous';
  }

  const falseHit = outcome === 'stolen' && rand() < FALSE_HIT_CHANCE;
  const other = falseHit ? makeVehicle(rand, owner.id) : car;
  if (falseHit && other.make === car.make && other.model === car.model) other.year = car.year > 2012 ? car.year - 3 : car.year + 3;
  const reported = `${other.year} ${other.make} ${other.model}, ${other.color}`;

  return {
    id: `TS-${n}`,
    unitId: unit.id,
    x: unit.x,
    y: unit.y,
    postal: nearestPostal(unit.x, unit.y) ?? 0,
    vehicle: `${car.color} ${car.body}`,
    plate: car.plate,
    car,
    driver,
    owner,
    outcome,
    startedAt: clock,
    duration: 50 + Math.floor(rand() * 30),
    ackAt: null,
    plateAskedAt: null,
    plateAt: null,
    plateResult: null,
    falseHit,
    reported,
    confirmAskedAt: null,
    confirmAt: null,
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
  const confirms = needsConfirm(stop.outcome);
  const plateMax = confirms ? 25 : 30;
  const backupMax = confirms ? 40 : 50;

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
    total += wait <= 20 ? plateMax : wait <= 40 ? Math.round(plateMax * 0.65) : Math.round(plateMax * 0.35);
    notes.push(`Plate run after ${Math.round(wait)}s.`);
  }

  if (confirms) {
    if (stop.confirmAskedAt === null) {
      notes.push('The hit was never confirmed with the originating agency.');
    } else {
      const wait = stop.confirmAskedAt - (stop.plateAt ?? stop.confirmAskedAt);
      total += wait <= 20 ? 15 : wait <= 45 ? 10 : 5;
      notes.push(stop.falseHit ? `Confirmed after ${Math.round(wait)}s, the vehicle did not match.` : `Hit confirmed after ${Math.round(wait)}s.`);
    }
  }

  const wrong = stop.falseHit && stop.confirmAt !== null;
  const needed = wrong ? 0 : backupNeeded(stop.outcome);
  if (needed === 0) {
    if (stop.backupIds.length === 0) {
      total += backupMax;
      notes.push('Backup was not needed and none was sent.');
    } else if (wrong && stop.backupSentAt !== null && stop.backupSentAt < stop.confirmAt!) {
      total += Math.round(backupMax * 0.6);
      notes.push('Backup was sent before the hit was confirmed. Careful, but the vehicle did not match.');
    } else {
      notes.push(`Backup was not needed, ${stop.backupIds.length} units were sent anyway.`);
    }
  } else if (stop.backupIds.length === 0) {
    notes.push(`The plate was ${stop.outcome === 'felony' ? 'a felony hit' : stop.outcome}, backup was needed and none came.`);
  } else {
    const wait = stop.backupSentAt !== null && stop.backupAskedAt !== null ? stop.backupSentAt - stop.backupAskedAt : Infinity;
    const enough = stop.backupIds.length >= needed;
    total += enough ? (wait <= 30 ? backupMax : Math.round(backupMax * 0.7)) : Math.round(backupMax * 0.4);
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

    if (s.confirmAskedAt !== null && s.confirmAt === null && clock >= s.confirmAskedAt + CONFIRM_DELAY) {
      s = { ...s, confirmAt: clock };
      if (s.falseHit) {
        lines.push(['DISP', `${s.unitId}, the sheriff's office says the stolen vehicle is a ${s.reported}. That is not your vehicle, the plate was entered in error.`]);
        lines.push([s.unitId, `${s.unitId} copy, vehicle does not match, standing down on backup.`]);
      } else {
        lines.push(['DISP', `${s.unitId}, the hit is confirmed with the originating agency, ${confirmed[s.outcome]}.`]);
      }
    }
    const cleared = s.falseHit && s.confirmAt !== null;

    if (s.plateAskedAt !== null && s.plateResult === null && clock >= s.plateAskedAt + PLATE_DELAY) {
      const line = plateLine(s);
      s = { ...s, plateResult: line, plateAt: clock };
      lines.push(['DISP', `${s.unitId}, plate ${s.plate} returns ${line}.`]);
      if (needed > 0) {
        s = { ...s, backupAskedAt: clock };
        lines.push([s.unitId, `${s.unitId} copy, request ${needed > 1 ? 'two units' : 'a unit'} for backup at the stop, ${backupReason[s.outcome]}.`, true]);
      }
    }

    if (needed > 0 && s.plateAskedAt === null && age > REMIND_AFTER && !s.reminded) {
      s = { ...s, reminded: true };
      lines.push([s.unitId, `${s.unitId} to dispatch, did you get that plate?`]);
    }

    if (!cleared && needed > 0 && s.backupAskedAt !== null && s.backupIds.length < needed && clock > s.backupAskedAt + ESCALATE_AFTER && !s.escalated) {
      s = { ...s, escalated: true };
      lines.push([s.unitId, `${s.unitId} I need that backup now!`, true]);
    }

    const arrived = units.filter((u) => u.status === 'onscene' && s.backupIds.includes(u.id)).length;
    if (!cleared && needed > 0 && s.backupArrivedAt === null && arrived >= needed) s = { ...s, backupArrivedAt: clock };

    let close = false;
    let failed = false;
    if (cleared) {
      close = clock >= s.confirmAt! + LEAVE_AFTER_BACKUP;
    } else if (needed === 0) {
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
