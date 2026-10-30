import { postalById } from '../data/postals';
import type { Unit } from './types';

export const UNIT_SPEED = 60;

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function etaSeconds(unit: Pick<Unit, 'x' | 'y'>, postal: number): number | null {
  const p = postalById.get(postal);
  if (!p) return null;
  return distance(unit.x, unit.y, p.x, p.y) / UNIT_SPEED;
}

export function stepUnit(unit: Unit, dt: number): { unit: Unit; arrived: boolean } {
  if (unit.status !== 'enroute' || unit.targetX === null || unit.targetY === null) {
    return { unit, arrived: false };
  }
  const left = distance(unit.x, unit.y, unit.targetX, unit.targetY);
  const step = UNIT_SPEED * dt;
  if (step >= left) {
    return {
      unit: { ...unit, x: unit.targetX, y: unit.targetY, targetX: null, targetY: null, status: 'onscene' },
      arrived: true,
    };
  }
  const k = step / left;
  return {
    unit: { ...unit, x: unit.x + (unit.targetX - unit.x) * k, y: unit.y + (unit.targetY - unit.y) * k },
    arrived: false,
  };
}

export function nearestPostal(x: number, y: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const p of postalById.values()) {
    const d = distance(x, y, p.x, p.y);
    if (d < bestDist) {
      bestDist = d;
      best = p.id;
    }
  }
  return best;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
