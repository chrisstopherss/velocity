import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type P = [number, number];

const here = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(here, '..', 'apps', 'web', 'src', 'data', 'erlc-map-data.json');
const outFile = path.join(here, '..', 'apps', 'web', 'src', 'data', 'roads.data.ts');

// same transform as build-postals.ts
const KX = 0.3589;
const CX = 3.5;
const KZ = 0.3598;
const CZ = 2.8;

// game units
const SIMPLIFY = 5;
const SNAP = 30;
const MERGE = 3.5;
const JOIN = 400;

const { roads, postals } = JSON.parse(readFileSync(dataFile, 'utf8')) as {
  roads: { name: string; segments: P[][] }[];
  postals: { code: string; x: number; z: number }[];
};

function simplify(pts: P[], tol: number): P[] {
  if (pts.length < 3) return pts;
  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, az] = pts[a];
    const [bx, bz] = pts[b];
    const len = Math.hypot(bx - ax, bz - az) || 1e-9;
    let far = -1;
    let farDist = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bz - az) * pts[i][0] - (bx - ax) * pts[i][1] + bx * az - bz * ax) / len;
      if (d > farDist) {
        farDist = d;
        far = i;
      }
    }
    if (far !== -1) {
      keep[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const polys = roads.flatMap((r) => r.segments.map((s) => simplify(s, SIMPLIFY))).filter((p) => p.length > 1);

// splits[poly][segment] holds t values where another road crosses or joins
const splits: number[][][] = polys.map((p) => p.slice(1).map(() => []));
const bridges: [P, P][] = [];

function cross(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number) {
  const rx = bx - ax;
  const rz = bz - az;
  const sx = dx - cx;
  const sz = dz - cz;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * sz - (cz - az) * sx) / den;
  const u = ((cx - ax) * rz - (cz - az) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
}

for (let i = 0; i < polys.length; i++) {
  for (let j = i + 1; j < polys.length; j++) {
    for (let a = 0; a < polys[i].length - 1; a++) {
      for (let b = 0; b < polys[j].length - 1; b++) {
        const hit = cross(...polys[i][a], ...polys[i][a + 1], ...polys[j][b], ...polys[j][b + 1]);
        if (hit) {
          splits[i][a].push(hit.t);
          splits[j][b].push(hit.u);
        }
      }
    }
  }
}

function nearestOnOthers(point: P, own: number): { poly: number; seg: number; t: number; at: P; dist: number } | null {
  let best: { poly: number; seg: number; t: number; at: P; dist: number } | null = null;
  for (let j = 0; j < polys.length; j++) {
    if (j === own) continue;
    for (let s = 0; s < polys[j].length - 1; s++) {
      const [ax, az] = polys[j][s];
      const [bx, bz] = polys[j][s + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const len = dx * dx + dz * dz;
      const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((point[0] - ax) * dx + (point[1] - az) * dz) / len));
      const at: P = [ax + t * dx, az + t * dz];
      const dist = Math.hypot(point[0] - at[0], point[1] - at[1]);
      if (dist <= SNAP && (!best || dist < best.dist)) best = { poly: j, seg: s, t, at, dist };
    }
  }
  return best;
}

// a road that ends near another road joins it
for (let i = 0; i < polys.length; i++) {
  for (const end of [polys[i][0], polys[i][polys[i].length - 1]]) {
    const hit = nearestOnOthers(end, i);
    if (hit) {
      splits[hit.poly][hit.seg].push(hit.t);
      if (hit.dist > 0.01) bridges.push([end, hit.at]);
    }
  }
}

const nodes: P[] = [];
const grid = new Map<string, number[]>();
const cell = (v: number) => Math.floor(v / MERGE);

function nodeAt(p: P): number {
  for (let gx = cell(p[0]) - 1; gx <= cell(p[0]) + 1; gx++) {
    for (let gz = cell(p[1]) - 1; gz <= cell(p[1]) + 1; gz++) {
      for (const id of grid.get(`${gx},${gz}`) ?? []) {
        if (Math.hypot(nodes[id][0] - p[0], nodes[id][1] - p[1]) <= MERGE) return id;
      }
    }
  }
  const id = nodes.length;
  nodes.push(p);
  const key = `${cell(p[0])},${cell(p[1])}`;
  grid.set(key, [...(grid.get(key) ?? []), id]);
  return id;
}

const edges = new Set<string>();
function link(a: number, b: number) {
  if (a !== b) edges.add(a < b ? `${a},${b}` : `${b},${a}`);
}

polys.forEach((poly, i) => {
  let prev = nodeAt(poly[0]);
  for (let s = 0; s < poly.length - 1; s++) {
    const [ax, az] = poly[s];
    const [bx, bz] = poly[s + 1];
    const ts = [...new Set(splits[i][s].map((t) => Math.round(t * 1e6) / 1e6))].sort((x, y) => x - y);
    for (const t of [...ts, 1]) {
      const here = nodeAt([ax + (bx - ax) * t, az + (bz - az) * t]);
      link(prev, here);
      prev = here;
    }
  }
});
for (const [a, b] of bridges) link(nodeAt(a), nodeAt(b));

function analyze() {
  const adj: number[][] = nodes.map(() => []);
  for (const key of edges) {
    const [a, b] = key.split(',').map(Number);
    adj[a].push(b);
    adj[b].push(a);
  }
  const comp = new Array<number>(nodes.length).fill(-1);
  const sizes: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (comp[i] !== -1) continue;
    const stack = [i];
    comp[i] = sizes.length;
    let n = 0;
    while (stack.length) {
      const u = stack.pop()!;
      n++;
      for (const v of adj[u]) if (comp[v] === -1) (comp[v] = sizes.length), stack.push(v);
    }
    sizes.push(n);
  }
  return { comp, sizes, main: sizes.indexOf(Math.max(...sizes)) };
}

function closestGap(comp: number[]): { d: number; a: number; b: number } {
  let best = { d: Infinity, a: -1, b: -1 };
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (comp[i] === comp[j]) continue;
      const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
      if (d < best.d) best = { d, a: i, b: j };
    }
  }
  return best;
}

// separate pieces closer than JOIN are treated as one network, the gaps are printed so they can be checked
const joins: string[] = [];
for (;;) {
  const { comp } = analyze();
  const gap = closestGap(comp);
  if (gap.d > JOIN) break;
  link(gap.a, gap.b);
  joins.push(`${gap.d.toFixed(0)}u at ${nodes[gap.a].map((v) => v.toFixed(0)).join(',')}`);
}
const { comp, sizes, main } = analyze();

const cutOff = postals.filter((p) => {
  let best = -1;
  let bestDist = Infinity;
  nodes.forEach((n, i) => {
    const d = Math.hypot(n[0] - p.x, n[1] - p.z);
    if (d < bestDist) (bestDist = d), (best = i);
  });
  return comp[best] !== main;
});

const px = (n: P) => `[${(KX * n[0] + CX).toFixed(1)}, ${(KZ * n[1] + CZ).toFixed(1)}]`;
writeFileSync(
  outFile,
  `// road graph in the 1932 px space of public/map/erlc-map.webp
// generated by scripts/build-roads.ts from the road lines in erlc-map-data.json
// refine it with the road editor at /#roads
export const rawRoads: { nodes: [number, number][]; edges: [number, number][] } = {
  nodes: [
${nodes.map((n) => `    ${px(n)},`).join('\n')}
  ],
  edges: [
${[...edges].map((e) => `    [${e}],`).join('\n')}
  ],
};
`,
);

console.log(`polylines: ${polys.length}, nodes: ${nodes.length}, roads: ${edges.size}, bridges: ${bridges.length}`);
console.log(`joined ${joins.length} gaps: ${joins.join('; ')}`);
console.log(`separate networks: ${sizes.length}, sizes: ${[...sizes].sort((a, b) => b - a).slice(0, 8).join(' ')}`);
console.log(`postals cut off from the main network: ${cutOff.map((p) => p.code).join(' ') || 'none'}`);
