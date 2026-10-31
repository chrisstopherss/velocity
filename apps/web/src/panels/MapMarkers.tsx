import type { ReactNode } from 'react';
import type { Agency, Priority, Unit } from '../game/types';

export const agencyColor: Record<Agency, string> = { PD: '#3b82f6', SO: '#0f9f6e', SP: '#c9791a' };
export const agencyIcons: Record<Agency, ReactNode> = {
  PD: (
    <path
      fill="#ffffff"
      stroke="none"
      d="M16.475 4.935c.505-.025.962-.09 1.351-.168l1.732 1.98c-.39.82-.612 1.602-.695 2.377c-.124 1.157.089 2.143.245 2.863l.007.033c.162.744.269 1.234.253 1.809c-.015.541-.147 1.256-.657 2.277c-1.1 2.201-3.695 2.666-5.715 3.675c-.326.164-.662.35-.996.569a10 10 0 0 0-.996-.569c-2.02-1.01-4.614-1.474-5.715-3.675c-.51-1.02-.642-1.736-.657-2.277c-.016-.575.09-1.065.253-1.81l.007-.032c.156-.72.369-1.706.245-2.863a7.3 7.3 0 0 0-.695-2.377l1.732-1.98c.389.078.846.143 1.351.168C8.79 4.998 10.402 4.81 12 3.918c1.598.892 3.21 1.08 4.475 1.017m4.612 6.739c-.323-1.479-.626-2.866.913-5.174l-3.5-4S15 4 12 1.5c-3 2.5-6.5 1-6.5 1L2 6.5c1.539 2.308 1.236 3.695.913 5.174c-.306 1.404-.63 2.89.587 5.326c1.577 3.154 4.708 3.51 6.943 4.745c.6.332 1.134.726 1.557 1.255c.423-.529.958-.923 1.558-1.255C15.792 20.51 18.923 20.154 20.5 17c1.218-2.435.893-3.922.587-5.326m-6.71 1.099l.562 3.272l-2.94-1.545l-2.938 1.545l.561-3.273l-2.377-2.317l3.285-.478L12 7l1.47 2.977l3.285.478z"
    />
  ),
  SO: (
    <>
      <path d="M12 2Q15.1 6.63 20.66 7Q18.2 12 20.66 17Q15.1 17.37 12 22Q8.9 17.37 3.34 17Q5.8 12 3.34 7Q8.9 6.63 12 2Z" />
      <circle cx={12} cy={12} r={2.8} />
    </>
  ),
  SP: (
    <>
      <path d="M3.5 13.5V10c0-1.4 1.3-2.1 2-2.5l5.5-3.1a2 2 0 0 1 2 0l5.5 3.1c.7.4 2 1.1 2 2.5v3.5" />
      <path d="M5 14h14" />
      <path d="M5 14c-.6.5-.6 1.2-.6 2v1.7c0 .7.5 1.2 1.2 1.4L12 20.6l6.4-1.5c.7-.2 1.2-.7 1.2-1.4V16c0-.8 0-1.5-.6-2" />
      <path strokeWidth={1.6} d="M12 6.9l2 .9v1.7c0 1.2-.9 2-2 2.4-1.1-.4-2-1.2-2-2.4V7.8z" />
    </>
  ),
};

export const priorityStyle: Record<Priority, { fill: string; ink: string }> = {
  1: { fill: '#d7414d', ink: '#ffffff' },
  2: { fill: '#f5a54a', ink: '#0b0c0f' },
  3: { fill: '#2f6fe8', ink: '#ffffff' },
  4: { fill: '#aab1be', ink: '#0b0c0f' },
};

const MIN_STEP = 3;

export function headingOf(unit: Pick<Unit, 'x' | 'y' | 'status' | 'route'>): number | null {
  const next = unit.route.find((p) => Math.hypot(p.x - unit.x, p.y - unit.y) > MIN_STEP);
  if (!next) return null;
  return (Math.atan2(next.x - unit.x, unit.y - next.y) * 180) / Math.PI;
}

export function UnitMarker({ unit, scale }: { unit: Unit; scale: number }) {
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
      <svg
        x={-8}
        y={-8}
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {agencyIcons[unit.agency]}
      </svg>
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
