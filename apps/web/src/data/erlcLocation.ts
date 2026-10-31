import mapData from './erlc-map-data.json';

export interface ErlcLocation {
  street: string | null;
  building: string | null;
  postal: string | null;
}

interface Segment {
  name: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

interface Spot {
  code: string;
  x: number;
  z: number;
}

// search distances in game units
const STREET_RADIUS = 120;
const BUILDING_RADIUS = 80;
const POSTAL_RADIUS = 400;

const segments: Segment[] = mapData.roads.flatMap((road) =>
  road.segments.flatMap((line) =>
    line.slice(1).map((b, i) => ({ name: road.name, ax: line[i][0], az: line[i][1], bx: b[0], bz: b[1] })),
  ),
);
const buildings: Spot[] = mapData.buildings;
const postals: Spot[] = mapData.postals;

function distanceToSegment(x: number, z: number, s: Segment): number {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const len = dx * dx + dz * dz;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / len));
  return Math.hypot(x - (s.ax + t * dx), z - (s.az + t * dz));
}

function nearestSpot(spots: Spot[], x: number, z: number, radius: number): string | null {
  let best: string | null = null;
  let bestDist = radius;
  for (const s of spots) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d <= bestDist) {
      bestDist = d;
      best = s.code;
    }
  }
  return best;
}

function nearestStreet(x: number, z: number): string | null {
  let best: string | null = null;
  let bestDist = STREET_RADIUS;
  for (const s of segments) {
    const d = distanceToSegment(x, z, s);
    if (d <= bestDist) {
      bestDist = d;
      best = s.name;
    }
  }
  return best;
}

export function getErlcLocation(x: number, z: number): ErlcLocation | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const result = {
    street: nearestStreet(x, z),
    building: nearestSpot(buildings, x, z, BUILDING_RADIUS),
    postal: nearestSpot(postals, x, z, POSTAL_RADIUS),
  };
  return result.street || result.building || result.postal ? result : null;
}
