import { CarFront, Locate, Map as MapIcon, MapPin, Maximize, Search } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { postalById } from '../data/postals';
import type { GameApi } from '../game/useGame';
import type { Agency } from '../game/types';
import { Panel } from '../ui/Panel';

const MAP_SIZE = 1932;
const ASPECT = 1.6;
const FULL = { x: 0, y: 0, w: MAP_SIZE };
const START = { x: 760, y: 820, w: 900 };

const agencyColor: Record<Agency, string> = { PD: '#3b82f6', SO: '#10b981', SP: '#e0932e' };

interface View {
  x: number;
  y: number;
  w: number;
}

function clampView(v: View): View {
  const w = Math.min(MAP_SIZE, Math.max(240, v.w));
  const h = w / ASPECT;
  return {
    w,
    x: Math.min(MAP_SIZE - w, Math.max(0, v.x)),
    y: Math.min(MAP_SIZE - h, Math.max(0, v.y)),
  };
}

function centerOn(x: number, y: number, w: number): View {
  return clampView({ x: x - w / 2, y: y - w / ASPECT / 2, w });
}

export function MapView({ g }: { g: GameApi }) {
  const { state } = g;
  const [view, setView] = useState<View>(START);
  const [search, setSearch] = useState('');
  const drag = useRef<{ px: number; py: number; view: View } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const incidentPostal = state.incident ? postalById.get(state.incident.postal) : undefined;
  const incidentId = state.incident?.id;

  useEffect(() => {
    if (incidentPostal) setView(centerOn(incidentPostal.x, incidentPostal.y, 560));
  }, [incidentId, incidentPostal]);

  const h = view.w / ASPECT;
  const scale = view.w / 900;

  const onWheel = (e: WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const nextW = Math.min(MAP_SIZE, Math.max(240, view.w * factor));
    const nextH = nextW / ASPECT;
    setView(clampView({ w: nextW, x: view.x + (view.w - nextW) * fx, y: view.y + (h - nextH) * fy }));
  };

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, view };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const k = d.view.w / rect.width;
    setView(clampView({ w: d.view.w, x: d.view.x - (e.clientX - d.px) * k, y: d.view.y - (e.clientY - d.py) * k }));
  };

  const goToPostal = () => {
    const p = postalById.get(Number(search));
    if (p) setView(centerOn(p.x, p.y, 420));
  };

  return (
    <Panel
      title="Live map"
      icon={<MapIcon size={16} aria-hidden="true" />}
      className="panel-map"
      extra={
        <span className="map-tools">
          <span className="postal-search">
            <input
              aria-label="Postal"
              inputMode="numeric"
              placeholder="Postal"
              value={search}
              onChange={(e) => setSearch(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && goToPostal()}
            />
            <button type="button" aria-label="Go to postal" onClick={goToPostal}>
              <Search size={13} aria-hidden="true" />
            </button>
          </span>
          <button type="button" aria-label="Zoom to full map" title="Full map" onClick={() => setView(FULL)}>
            <Maximize size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Zoom to incident"
            title="Incident"
            disabled={!incidentPostal}
            onClick={() => incidentPostal && setView(centerOn(incidentPostal.x, incidentPostal.y, 560))}
          >
            <Locate size={14} aria-hidden="true" />
          </button>
        </span>
      }
    >
      <svg
        ref={svgRef}
        className="map"
        viewBox={`${view.x} ${view.y} ${view.w} ${h}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Map of Liberty County with unit positions"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <rect width={MAP_SIZE} height={MAP_SIZE} fill="#1c2a1f" />
        <image href="/map/erlc-map.webp" width={MAP_SIZE} height={MAP_SIZE} className="map-img" />

        {incidentPostal ? (
          <g transform={`translate(${incidentPostal.x} ${incidentPostal.y})`}>
            <circle r={17 * scale} fill="#e0932e" stroke="#0b0c0f" strokeWidth={3 * scale} />
            <MapPin x={-11 * scale} y={-12 * scale} size={22 * scale} color="#fff" strokeWidth={2} />
          </g>
        ) : null}

        {state.units.map((u) => (
          <g key={u.id} transform={`translate(${u.x} ${u.y})`}>
            <circle r={13 * scale} fill={agencyColor[u.agency]} stroke="#0b0c0f" strokeWidth={3 * scale} />
            <CarFront x={-9 * scale} y={-9 * scale} size={18 * scale} color="#fff" strokeWidth={2} />
            <text x={17 * scale} y={5 * scale} fontSize={15 * scale} className="map-label">
              {u.name}
            </text>
          </g>
        ))}
      </svg>
    </Panel>
  );
}
