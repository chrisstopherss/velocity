import type { RoadData } from '../game/routing';

export type Draft = RoadData;

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function addNode(d: Draft, x: number, y: number, linkTo: number | null): { draft: Draft; id: number } {
  const id = d.nodes.length;
  const nodes: Draft['nodes'] = [...d.nodes, [Math.round(x * 10) / 10, Math.round(y * 10) / 10]];
  const edges = linkTo !== null && linkTo < id ? [...d.edges, [linkTo, id] as [number, number]] : d.edges;
  return { draft: { nodes, edges }, id };
}

export function toggleEdge(d: Draft, a: number, b: number): Draft {
  if (a === b || !d.nodes[a] || !d.nodes[b]) return d;
  const k = key(a, b);
  const has = d.edges.some(([u, v]) => key(u, v) === k);
  return { nodes: d.nodes, edges: has ? d.edges.filter(([u, v]) => key(u, v) !== k) : [...d.edges, [a, b]] };
}

export function moveNode(d: Draft, id: number, x: number, y: number): Draft {
  if (!d.nodes[id]) return d;
  const nodes = d.nodes.slice();
  nodes[id] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  return { nodes, edges: d.edges };
}

export function removeNode(d: Draft, id: number): Draft {
  if (!d.nodes[id]) return d;
  const shift = (n: number) => (n > id ? n - 1 : n);
  return {
    nodes: d.nodes.filter((_, i) => i !== id),
    edges: d.edges.filter(([a, b]) => a !== id && b !== id).map(([a, b]) => [shift(a), shift(b)] as [number, number]),
  };
}

export function components(d: Draft): number[] {
  const adj: number[][] = d.nodes.map(() => []);
  for (const [a, b] of d.edges) {
    adj[a]?.push(b);
    adj[b]?.push(a);
  }
  const comp = new Array<number>(d.nodes.length).fill(-1);
  let next = 0;
  for (let i = 0; i < d.nodes.length; i++) {
    if (comp[i] !== -1) continue;
    const stack = [i];
    comp[i] = next;
    while (stack.length) {
      const u = stack.pop()!;
      for (const v of adj[u]) {
        if (comp[v] === -1) {
          comp[v] = next;
          stack.push(v);
        }
      }
    }
    next++;
  }
  return comp;
}

export interface Check {
  parts: number;
  cutOff: number[];
}

export function check(d: Draft, postals: { id: number; x: number; y: number }[]): Check {
  if (!d.nodes.length) return { parts: 0, cutOff: postals.map((p) => p.id) };
  const comp = components(d);
  const sizes = new Map<number, number>();
  for (const c of comp) sizes.set(c, (sizes.get(c) ?? 0) + 1);
  const main = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const cutOff: number[] = [];
  for (const p of postals) {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < d.nodes.length; i++) {
      const dist = (d.nodes[i][0] - p.x) ** 2 + (d.nodes[i][1] - p.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (comp[best] !== main) cutOff.push(p.id);
  }
  return { parts: sizes.size, cutOff };
}

export function serialize(d: Draft): string {
  const rows = (list: number[][]) => list.map((p) => `    [${p.join(', ')}],`).join('\n');
  return [
    '// road graph in the 1932 px space of public/map/erlc-map.webp',
    '// edit it with the road editor at /#roads',
    'export const rawRoads: { nodes: [number, number][]; edges: [number, number][] } = {',
    '  nodes: [',
    rows(d.nodes),
    '  ],',
    '  edges: [',
    rows(d.edges),
    '  ],',
    '};',
    '',
  ].join('\n');
}
