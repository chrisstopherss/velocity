import { rawRoads } from '../data/roads.data';
import type { Point } from './types';

const NEAR = 25;
const MAX_SNAP = 150;
const CORNER = 10;
const CANDIDATES = 4;
const EXTRA_OFF = 45;
const CANDIDATE_GAP = 25;

export interface RoadData {
  nodes: [number, number][];
  edges: [number, number][];
}

interface Link {
  to: number;
  len: number;
}

interface Search {
  dist: Float64Array;
  prev: Int32Array;
}

export interface RoadGraph {
  points: Point[];
  adj: Link[][];
  edges: [number, number][];
  fromSource: Map<number, Search>;
}

export interface Route {
  points: Point[];
  length: number;
  onRoad: boolean;
}

interface Snap {
  edge: number;
  at: Point;
  off: number;
  toA: number;
  toB: number;
}

export function buildGraph(data: RoadData): RoadGraph {
  const points = data.nodes.map(([x, y]) => ({ x, y }));
  const adj: Link[][] = points.map(() => []);
  const edges: [number, number][] = [];
  for (const [a, b] of data.edges) {
    if (a === b || !points[a] || !points[b]) continue;
    const len = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
    adj[a].push({ to: b, len });
    adj[b].push({ to: a, len });
    edges.push([a, b]);
  }
  return { points, adj, edges, fromSource: new Map() };
}

export const roadGraph = buildGraph(rawRoads);

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function snapToRoad(graph: RoadGraph, p: Point): Snap[] {
  const found: Snap[] = [];
  graph.edges.forEach(([a, b], edge) => {
    const pa = graph.points[a];
    const pb = graph.points[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - pa.x) * dx + (p.y - pa.y) * dy) / len));
    const at = { x: pa.x + dx * t, y: pa.y + dy * t };
    const off = dist(p, at);
    if (off <= MAX_SNAP) found.push({ edge, at, off, toA: dist(at, pa), toB: dist(at, pb) });
  });
  found.sort((x, y) => x.off - y.off);

  // a few different roads close to the point, not just neighbouring segments of one road
  const picked: Snap[] = [];
  for (const c of found) {
    if (picked.length >= CANDIDATES || c.off > found[0].off + EXTRA_OFF) break;
    if (picked.every((q) => dist(q.at, c.at) > CANDIDATE_GAP)) picked.push(c);
  }
  return picked;
}

class Heap {
  private items: [number, number][] = [];

  get size() {
    return this.items.length;
  }

  push(item: [number, number]) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop(): [number, number] {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function search(graph: RoadGraph, source: number): Search {
  const cached = graph.fromSource.get(source);
  if (cached) return cached;

  const n = graph.points.length;
  const d = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap = new Heap();
  d[source] = 0;
  heap.push([0, source]);

  while (heap.size) {
    const [cost, u] = heap.pop();
    if (cost > d[u]) continue;
    for (const { to, len } of graph.adj[u]) {
      const next = cost + len;
      if (next < d[to]) {
        d[to] = next;
        prev[to] = u;
        heap.push([next, to]);
      }
    }
  }

  const result = { dist: d, prev };
  graph.fromSource.set(source, result);
  return result;
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

function dedupe(points: Point[]): Point[] {
  return points.filter((p, i) => i === 0 || dist(p, points[i - 1]) > 0.01);
}

export function roundCorners(points: Point[], radius = CORNER): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const d1 = Math.min(radius, dist(p0, p1) / 2);
    const d2 = Math.min(radius, dist(p1, p2) / 2);
    const l1 = dist(p0, p1) || 1;
    const l2 = dist(p1, p2) || 1;
    const a = { x: p1.x + ((p0.x - p1.x) / l1) * d1, y: p1.y + ((p0.y - p1.y) / l1) * d1 };
    const b = { x: p1.x + ((p2.x - p1.x) / l2) * d2, y: p1.y + ((p2.y - p1.y) / l2) * d2 };
    out.push(a);
    for (const t of [0.25, 0.5, 0.75]) {
      const u = 1 - t;
      out.push({
        x: u * u * a.x + 2 * u * t * p1.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * p1.y + t * t * b.y,
      });
    }
    out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

export function routeBetween(graph: RoadGraph, from: Point, to: Point): Route {
  const straight: Route = { points: [from, to], length: dist(from, to), onRoad: false };
  if (!graph.edges.length || straight.length < NEAR) return straight;

  const starts = snapToRoad(graph, from);
  const ends = snapToRoad(graph, to);
  if (!starts.length || !ends.length) return straight;

  let best: { cost: number; s: Snap; e: Snap; start: number; end: number } = {
    cost: Infinity,
    s: starts[0],
    e: ends[0],
    start: -1,
    end: -1,
  };
  for (const s of starts) {
    for (const e of ends) {
      if (s.edge === e.edge) {
        const cost = s.off + dist(s.at, e.at) + e.off;
        if (cost < best.cost) best = { cost, s, e, start: -1, end: -1 };
        continue;
      }
      const [sa, sb] = graph.edges[s.edge];
      const [ea, eb] = graph.edges[e.edge];
      for (const [start, startOff] of [[sa, s.toA], [sb, s.toB]] as const) {
        for (const [end, endOff] of [[ea, e.toA], [eb, e.toB]] as const) {
          const cost = s.off + startOff + search(graph, end).dist[start] + endOff + e.off;
          if (cost < best.cost) best = { cost, s, e, start, end };
        }
      }
    }
  }
  if (!Number.isFinite(best.cost)) return straight;

  const raw: Point[] = [from, best.s.at];
  if (best.start !== -1) {
    const { prev } = search(graph, best.end);
    for (let node = best.start; node !== -1; node = prev[node]) raw.push(graph.points[node]);
  }
  raw.push(best.e.at, to);

  const points = dedupe(raw);
  return { points: roundCorners(points), length: polylineLength(points), onRoad: true };
}
