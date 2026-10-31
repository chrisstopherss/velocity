import { UNIT_SPEED, formatEta } from '../game/sim';
import type { Point } from '../game/types';

interface Props {
  ahead: Point[];
  trail?: Point[];
  scale: number;
}

const pointsAttr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

function lengthOf(pts: Point[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return total;
}

export function pointAlong(pts: Point[], at: number): Point {
  let left = at;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (left <= seg && seg > 0) {
      const k = left / seg;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    }
    left -= seg;
  }
  return pts[pts.length - 1];
}

export function RouteLine({ ahead, trail, scale }: Props) {
  if (ahead.length < 2) return null;
  const length = lengthOf(ahead);
  const mid = pointAlong(ahead, length / 2);
  const round = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <g pointerEvents="none">
      {trail && trail.length > 1 ? (
        <>
          <polyline points={pointsAttr(trail)} stroke="#0b0c0f" strokeOpacity={0.7} strokeWidth={7 * scale} {...round} />
          <polyline points={pointsAttr(trail)} stroke="#8c97ad" strokeOpacity={0.75} strokeWidth={4 * scale} {...round} />
        </>
      ) : null}
      <polyline points={pointsAttr(ahead)} stroke="#ffffff" strokeOpacity={0.26} strokeWidth={17 * scale} {...round} />
      <polyline points={pointsAttr(ahead)} stroke="#0b0c0f" strokeWidth={9 * scale} {...round} />
      <polyline points={pointsAttr(ahead)} stroke="#4f8cff" strokeWidth={5.5 * scale} {...round} />
      <g transform={`translate(${mid.x} ${mid.y - 22 * scale}) scale(${scale})`}>
        <rect x={-34} y={-13} width={68} height={26} rx={8} fill="#121317" stroke="#252830" strokeWidth={1.5} />
        <g transform="translate(-26 -7) scale(0.58)" fill="none" stroke="#9aa1ae" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={12} cy={12} r={10} />
          <polyline points="12 6 12 12 16 14" />
        </g>
        <text x={-8} y={5} fontSize={13} fontWeight={700} fill="#ffffff" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatEta(length / UNIT_SPEED)}
        </text>
      </g>
    </g>
  );
}
