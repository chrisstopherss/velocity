import { rawStreets } from './streets.data';

export interface StreetLabel {
  id: number;
  name: string;
  d: string;
  length: number;
  box: [number, number, number, number];
}

type Pt = [number, number];

const CHUNK = 650;

function readable(points: Pt[]): Pt[] {
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const upright = Math.abs(dx) < Math.abs(dy) * 0.25;
  const flip = upright ? dy > 0 : dx < 0;
  return flip ? [...points].reverse() : points;
}

export function splitLine(points: Pt[], max = CHUNK): Pt[][] {
  const total = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
  const parts = Math.max(1, Math.ceil(total / max));
  const target = total / parts;
  const out: Pt[][] = [];
  let current: Pt[] = [points[0]];
  let run = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const p = points[i];
    let left = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    let from = prev;
    while (run + left > target && out.length < parts - 1) {
      const k = (target - run) / left;
      const cut: Pt = [from[0] + (p[0] - from[0]) * k, from[1] + (p[1] - from[1]) * k];
      current.push(cut);
      out.push(current);
      current = [cut];
      left -= target - run;
      from = cut;
      run = 0;
    }
    current.push(p);
    run += left;
  }
  out.push(current);
  return out;
}

function toLabel(id: number, name: string, points: Pt[]): StreetLabel {
  const length = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    id,
    name,
    length,
    d: points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(''),
    box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  };
}

export const streetLabels: StreetLabel[] = (() => {
  const out: StreetLabel[] = [];
  for (const [name, flat] of rawStreets) {
    const points: Pt[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) points.push([flat[i], flat[i + 1]]);
    if (points.length < 2) continue;
    for (const part of splitLine(readable(points))) {
      if (part.length > 1) out.push(toLabel(out.length, name, part));
    }
  }
  return out;
})();
