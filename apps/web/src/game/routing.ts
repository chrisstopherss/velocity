import { rawRoads } from '../data/roads.data';
import type { Point } from './types';

const NEAR = 25;

export interface RoadData {
  nodes: [number, number][];
  edges: [number, number][];
}

interface Link {
  to: number;
  len: number;
}

export interface RoadGraph {
  points: Point[];
  adj: Link[][];
  fromSource: Map<number, Search>;
}

interface Search {
  dist: Float64Array;
  prev: Int32Array;
}

export interface Route {
  points: Point[];
  length: number;
  onRoad: boolean;
}

export function buildGraph(data: RoadData): RoadGraph {
  const points = data.nodes.map(([x, y]) => ({ x, y }));
  const adj: Link[][] = points.map(() => []);
  for (const [a, b] of data.edges) {
    if (a === b || !points[a] || !points[b]) continue;
    const len = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
    adj[a].push({ to: b, len });
    adj[b].push({ to: a, len });
  }
  return { points, adj, fromSource: new Map() };
}

export const roadGraph = buildGraph(rawRoads);

export function nearestNode(graph: RoadGraph, x: number, y: number): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < graph.points.length; i++) {
    const d = (graph.points[i].x - x) ** 2 + (graph.points[i].y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function search(graph: RoadGraph, source: number): Search {
  const cached = graph.fromSource.get(source);
  if (cached) return cached;

  const n = graph.points.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: [number, number][] = [[0, source]];
  dist[source] = 0;

  while (heap.length) {
    let min = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[min][0]) min = i;
    const [d, u] = heap[min];
    heap[min] = heap[heap.length - 1];
    heap.pop();
    if (d > dist[u]) continue;
    for (const { to, len } of graph.adj[u]) {
      const nd = d + len;
      if (nd < dist[to]) {
        dist[to] = nd;
        prev[to] = u;
        heap.push([nd, to]);
      }
    }
  }

  const result = { dist, prev };
  graph.fromSource.set(source, result);
  return result;
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

export function routeBetween(graph: RoadGraph, from: Point, to: Point): Route {
  const straight: Route = { points: [from, to], length: polylineLength([from, to]), onRoad: false };
  if (!graph.points.length || straight.length < NEAR) return straight;

  const start = nearestNode(graph, from.x, from.y);
  const end = nearestNode(graph, to.x, to.y);
  const { dist, prev } = search(graph, end);
  if (!Number.isFinite(dist[start])) return straight;

  const points: Point[] = [from];
  for (let node = start; node !== -1; node = prev[node]) points.push(graph.points[node]);
  points.push(to);

  return { points, length: polylineLength(points), onRoad: true };
}
