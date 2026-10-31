import { Locate, Map as MapIcon, Maximize, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { postalById, postals } from '../data/postals';
import { streetLabels } from '../data/streets';
import { routeToPostal } from '../game/sim';
import type { GameApi } from '../game/useGame';
import type { Point } from '../game/types';
import { Panel } from '../ui/Panel';
import { IncidentMarker, UnitMarker } from './MapMarkers';
import { RouteLine } from './RouteLine';

const MAP_SIZE = 1932;
const ASPECT = 1.6;
const FULL = { x: 0, y: 0, w: MAP_SIZE };
const START = { x: 760, y: 820, w: 900 };
const POSTAL_LABEL_ZOOM = 1000;
const STREET_LABEL_ZOOM = 1100;

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

  const previews = useMemo(() => {
    if (state.phase !== 'incident' || !state.incident) return [];
    const postal = state.incident.postal;
    return state.units
      .filter((u) => g.selected.includes(u.id) && u.status === 'available')
      .map((u) => {
        const route = routeToPostal(u, postal);
        return route ? { id: u.id, points: [{ x: u.x, y: u.y }, ...route] } : null;
      })
      .filter((p): p is { id: string; points: Point[] } => p !== null);
  }, [state.phase, state.incident, state.units, g.selected]);

  useEffect(() => {
    if (incidentPostal) setView(centerOn(incidentPostal.x, incidentPostal.y, 560));
  }, [incidentId, incidentPostal]);

  const h = view.w / ASPECT;
  const scale = view.w / 900;

  const streets = useMemo(() => {
    if (view.w > STREET_LABEL_ZOOM) return [];
    const wide = 11 * 0.62 * (view.w / 900) * 1.2;
    return streetLabels.filter(
      (s) =>
        s.length >= s.name.length * wide &&
        s.box[2] > view.x &&
        s.box[0] < view.x + view.w &&
        s.box[3] > view.y &&
        s.box[1] < view.y + view.w / ASPECT,
    );
  }, [view.x, view.y, view.w]);

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

        {view.w <= STREET_LABEL_ZOOM ? (
          <>
            <defs>
              {streets.map((s) => (
                <path key={s.id} id={`street-${s.id}`} d={s.d} />
              ))}
            </defs>
            {streets.map((s) => (
              <text key={s.id} fontSize={11 * scale} dy="0.35em" className="map-street">
                <textPath href={`#street-${s.id}`} startOffset="50%" textAnchor="middle">
                  {s.name}
                </textPath>
              </text>
            ))}
          </>
        ) : null}

        {view.w <= POSTAL_LABEL_ZOOM
          ? postals
              .filter(
                (p) =>
                  p.id !== incidentPostal?.id &&
                  p.x > view.x - 20 &&
                  p.x < view.x + view.w + 20 &&
                  p.y > view.y - 20 &&
                  p.y < view.y + h + 20,
              )
              .map((p) => (
                <text key={p.id} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={12 * scale} className="map-postal">
                  {p.id}
                </text>
              ))
          : null}

        {previews.map((p) => (
          <RouteLine key={`preview-${p.id}`} ahead={p.points} scale={scale} />
        ))}

        {state.units
          .filter((u) => u.status === 'enroute' && u.route.length)
          .map((u) => (
            <RouteLine
              key={`route-${u.id}`}
              ahead={[{ x: u.x, y: u.y }, ...u.route]}
              trail={[...u.trail, { x: u.x, y: u.y }]}
              scale={scale}
            />
          ))}

        {incidentPostal && state.incident ? (
          <IncidentMarker x={incidentPostal.x} y={incidentPostal.y} priority={state.incident.priority} scale={scale} />
        ) : null}

        {state.units.map((u) => (
          <UnitMarker key={u.id} unit={u} scale={scale} />
        ))}
      </svg>
    </Panel>
  );
}
