import { postalById, postals } from '../data/postals';
import { mulberry32 } from '../data/scenarios';
import { roadGraph, routeBetween, type RoadGraph } from './routing';
import type { Point, Unit } from './types';

export const UNIT_SPEED = 60;
export const PATROL_SPEED = UNIT_SPEED * 0.5;
const PATROL_PAUSE = 1.5;
const PATROL_MIN = 120;
const PATROL_MAX = 750;

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function routeToPostal(unit: Pick<Unit, 'x' | 'y'>, postal: number, graph: RoadGraph = roadGraph): Point[] | null {
  const p = postalById.get(postal);
  if (!p) return null;
  return routeBetween(graph, { x: unit.x, y: unit.y }, { x: p.x, y: p.y }).points.slice(1);
}

export function etaSeconds(unit: Pick<Unit, 'x' | 'y'>, postal: number, graph: RoadGraph = roadGraph): number | null {
  const p = postalById.get(postal);
  if (!p) return null;
  return routeBetween(graph, { x: unit.x, y: unit.y }, { x: p.x, y: p.y }).length / UNIT_SPEED;
}

export function stepUnit(unit: Unit, dt: number): { unit: Unit; arrived: boolean } {
  if (unit.status === 'onscene' || !unit.route.length) {
    return { unit, arrived: false };
  }
  const responding = unit.status === 'enroute';
  let { x, y } = unit;
  let budget = (responding ? UNIT_SPEED : PATROL_SPEED) * dt;
  let i = 0;
  const passed: Point[] = [];
  while (i < unit.route.length) {
    const next = unit.route[i];
    const left = distance(x, y, next.x, next.y);
    if (left > budget) {
      const k = budget / left;
      x += (next.x - x) * k;
      y += (next.y - y) * k;
      const trail = responding && passed.length ? [...unit.trail, ...passed] : unit.trail;
      return { unit: { ...unit, x, y, route: unit.route.slice(i), trail }, arrived: false };
    }
    budget -= left;
    x = next.x;
    y = next.y;
    passed.push(next);
    i++;
  }
  if (responding) {
    return { unit: { ...unit, x, y, route: [], trail: [], status: 'onscene' }, arrived: true };
  }
  return { unit: { ...unit, x, y, route: [], wait: PATROL_PAUSE }, arrived: false };
}

const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

// a nearby postal to cruise to, chosen from the shift seed so a game replays the same way
export function patrolRoute(unit: Unit, seed: number, clock: number): Point[] {
  const rand = mulberry32(seed + hash(unit.id) + Math.floor(clock * 10));
  const near = postals.filter((p) => {
    const d = distance(unit.x, unit.y, p.x, p.y);
    return d > PATROL_MIN && d < PATROL_MAX;
  });
  const pool = near.length ? near : postals;
  const target = pool[Math.floor(rand() * pool.length)];
  return routeToPostal(unit, target.id) ?? [];
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
