import { postalById } from '../data/postals';
import { roadGraph, routeBetween, type RoadGraph } from './routing';
import type { Point, Unit } from './types';

export const UNIT_SPEED = 60;

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
  if (unit.status !== 'enroute' || !unit.route.length) {
    return { unit, arrived: false };
  }
  let { x, y } = unit;
  let budget = UNIT_SPEED * dt;
  let i = 0;
  const passed: Point[] = [];
  while (i < unit.route.length) {
    const next = unit.route[i];
    const left = distance(x, y, next.x, next.y);
    if (left > budget) {
      const k = budget / left;
      x += (next.x - x) * k;
      y += (next.y - y) * k;
      const trail = passed.length ? [...unit.trail, ...passed] : unit.trail;
      return { unit: { ...unit, x, y, route: unit.route.slice(i), trail }, arrived: false };
    }
    budget -= left;
    x = next.x;
    y = next.y;
    passed.push(next);
    i++;
  }
  return { unit: { ...unit, x, y, route: [], trail: [], status: 'onscene' }, arrived: true };
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

export function formatEta(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
