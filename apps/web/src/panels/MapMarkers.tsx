import { ChevronsUp, Shield, Star, type LucideIcon } from 'lucide-react';
import type { Agency, Priority, Unit } from '../game/types';

export const agencyColor: Record<Agency, string> = { PD: '#3b82f6', SO: '#0f9f6e', SP: '#c9791a' };
const agencyIcon: Record<Agency, LucideIcon> = { PD: Shield, SO: Star, SP: ChevronsUp };

export const priorityStyle: Record<Priority, { fill: string; ink: string }> = {
  1: { fill: '#d7414d', ink: '#ffffff' },
  2: { fill: '#f5a54a', ink: '#0b0c0f' },
  3: { fill: '#2f6fe8', ink: '#ffffff' },
  4: { fill: '#aab1be', ink: '#0b0c0f' },
};

const MIN_STEP = 3;

export function headingOf(unit: Pick<Unit, 'x' | 'y' | 'status' | 'route'>): number | null {
  if (unit.status !== 'enroute') return null;
  const next = unit.route.find((p) => Math.hypot(p.x - unit.x, p.y - unit.y) > MIN_STEP);
  if (!next) return null;
  return (Math.atan2(next.x - unit.x, unit.y - next.y) * 180) / Math.PI;
}

export function UnitMarker({ unit, scale }: { unit: Unit; scale: number }) {
  const Icon = agencyIcon[unit.agency];
  const heading = headingOf(unit);
  const r = 14;
  return (
    <g transform={`translate(${unit.x} ${unit.y}) scale(${scale})`}>
      {heading !== null ? (
        <g transform={`rotate(${heading})`}>
          <polygon
            points={`0,${-(r + 7)} 5.5,${-(r + 1)} -5.5,${-(r + 1)}`}
            fill="#ffffff"
            stroke="#0b0c0f"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </g>
      ) : null}
      <circle r={r} fill={agencyColor[unit.agency]} stroke="#0b0c0f" strokeWidth={2.5} />
      <circle r={r - 3.5} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1} />
      <Icon x={-7} y={-7} size={14} color="#ffffff" strokeWidth={2.4} />
      <text y={-(r + 12)} textAnchor="middle" fontSize={13} className="map-label">
        {unit.name}
      </text>
    </g>
  );
}

export function IncidentMarker({ x, y, priority, scale }: { x: number; y: number; priority: Priority; scale: number }) {
  const { fill, ink } = priorityStyle[priority];
  const s = 1.6;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g transform={`translate(${-12 * s} ${-22 * s}) scale(${s})`}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill={fill} stroke="#0b0c0f" strokeWidth={1.4} strokeLinejoin="round" />
      </g>
      <text y={-12 * s + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={ink}>
        {priority}
      </text>
    </g>
  );
}
