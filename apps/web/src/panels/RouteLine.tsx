import type { Point } from '../game/types';

interface Props {
  ahead: Point[];
  trail?: Point[];
  scale: number;
}

const pointsAttr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

export function RouteLine({ ahead, trail, scale }: Props) {
  if (ahead.length < 2) return null;
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
    </g>
  );
}
