import { ArrowLeft, Copy, Download, Eye, EyeOff, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { postals } from '../data/postals';
import { rawRoads } from '../data/roads.data';
import { addNode, check, moveNode, removeNode, serialize, toggleEdge, type Draft } from './edit';

const MAP_SIZE = 1932;
const ASPECT = 1.6;
const DRAFT_KEY = 'velocity.roads.draft';
const HISTORY_LIMIT = 100;

interface View {
  x: number;
  y: number;
  w: number;
}

function clampView(v: View): View {
  const w = Math.min(MAP_SIZE, Math.max(160, v.w));
  const h = w / ASPECT;
  return { w, x: Math.min(MAP_SIZE - w, Math.max(0, v.x)), y: Math.min(MAP_SIZE - h, Math.max(0, v.y)) };
}

function shipped(): Draft {
  return { nodes: rawRoads.nodes.map(([x, y]) => [x, y]), edges: rawRoads.edges.map(([a, b]) => [a, b]) };
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Draft;
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed;
    }
  } catch {
    // fall through to the shipped graph
  }
  return shipped();
}

interface Drag {
  kind: 'pan' | 'node';
  px: number;
  py: number;
  view: View;
  node: number;
  moved: boolean;
}

export function RoadEditor() {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [history, setHistory] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<View>({ x: 300, y: 1000, w: 900 });
  const [showPostals, setShowPostals] = useState(true);
  const [note, setNote] = useState('');
  const drag = useRef<Drag | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const report = useMemo(() => check(draft, postals), [draft]);
  const cutOff = useMemo(() => new Set(report.cutOff), [report]);
  const scale = view.w / 900;
  const h = view.w / ASPECT;

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage can be blocked, the editor still works
    }
  }, [draft]);

  const commit = (next: Draft) => {
    setHistory((cur) => [...cur.slice(-(HISTORY_LIMIT - 1)), draft]);
    setDraft(next);
  };

  const undo = () => {
    setHistory((cur) => {
      if (!cur.length) return cur;
      setDraft(cur[cur.length - 1]);
      setSelected(null);
      return cur.slice(0, -1);
    });
  };

  const deleteSelected = () => {
    if (selected === null) return;
    commit(removeNode(draft, selected));
    setSelected(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toMap = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };

  const onWheel = (e: WheelEvent) => {
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const before = toMap(e.clientX, e.clientY);
    const w = Math.min(MAP_SIZE, Math.max(160, view.w * factor));
    const k = w / view.w;
    setView(clampView({ w, x: before.x - (before.x - view.x) * k, y: before.y - (before.y - view.y) * k }));
  };

  const onBackgroundDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { kind: 'pan', px: e.clientX, py: e.clientY, view, node: -1, moved: false };
  };

  const onNodeDown = (e: PointerEvent, id: number) => {
    e.stopPropagation();
    (svgRef.current as Element).setPointerCapture(e.pointerId);
    drag.current = { kind: 'node', px: e.clientX, py: e.clientY, view, node: id, moved: false };
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    const m = svgRef.current?.getScreenCTM();
    if (!d || !m) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (d.kind === 'pan') {
      d.moved = true;
      setView(clampView({ w: d.view.w, x: d.view.x - dx / m.a, y: d.view.y - dy / m.a }));
    } else {
      if (!d.moved) setHistory((cur) => [...cur.slice(-(HISTORY_LIMIT - 1)), draft]);
      d.moved = true;
      const p = toMap(e.clientX, e.clientY);
      setDraft((cur) => moveNode(cur, d.node, p.x, p.y));
    }
  };

  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    if (d.kind === 'node') {
      if (selected === null) setSelected(d.node);
      else if (selected === d.node) setSelected(null);
      else {
        commit(toggleEdge(draft, selected, d.node));
        setSelected(d.node);
      }
      return;
    }
    const p = toMap(e.clientX, e.clientY);
    const res = addNode(draft, p.x, p.y, selected);
    commit(res.draft);
    setSelected(res.id);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(serialize(draft));
      setNote('Copied. Paste it over apps/web/src/data/roads.data.ts.');
    } catch {
      setNote('Clipboard blocked. Use Download instead.');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([serialize(draft)], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roads.data.ts';
    a.click();
    URL.revokeObjectURL(url);
    setNote('Saved roads.data.ts. Put it in apps/web/src/data/.');
  };

  const reset = () => {
    commit(shipped());
    setSelected(null);
    setNote('Back to the shipped graph. Undo brings your edits back.');
  };

  const edgePath = draft.edges
    .map(([a, b]) => {
      const p = draft.nodes[a];
      const q = draft.nodes[b];
      return p && q ? `M${p[0]} ${p[1]}L${q[0]} ${q[1]}` : '';
    })
    .join('');

  const linked = selected === null ? [] : draft.edges.filter(([a, b]) => a === selected || b === selected);

  return (
    <div className="road-editor">
      <header className="re-bar">
        <a className="re-btn" href="#" title="Back to the game">
          <ArrowLeft size={14} aria-hidden="true" />
          Game
        </a>
        <strong>Road editor</strong>
        <span className="re-stat">
          {draft.nodes.length} nodes, {draft.edges.length} roads
        </span>
        <span className={`re-stat ${report.cutOff.length || report.parts > 1 ? 'warn' : 'ok'}`}>
          {report.parts > 1 ? `${report.parts} separate networks. ` : ''}
          {report.cutOff.length ? `${report.cutOff.length} postals cut off` : 'every postal connected'}
        </span>
        <span className="re-grow" />
        <button type="button" className="re-btn" onClick={() => setShowPostals((v) => !v)}>
          {showPostals ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          Postals
        </button>
        <button type="button" className="re-btn" disabled={!history.length} onClick={undo}>
          <Undo2 size={14} aria-hidden="true" />
          Undo
        </button>
        <button type="button" className="re-btn" disabled={selected === null} onClick={deleteSelected}>
          <Trash2 size={14} aria-hidden="true" />
          Delete node
        </button>
        <button type="button" className="re-btn" onClick={reset}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset
        </button>
        <button type="button" className="re-btn" onClick={copy}>
          <Copy size={14} aria-hidden="true" />
          Copy
        </button>
        <button type="button" className="re-btn primary" onClick={download}>
          <Download size={14} aria-hidden="true" />
          Download
        </button>
      </header>
      <p className="re-help">
        {note ||
          'Click empty map to add a node (it links to the selected one). Click a node to select it, click another to link or unlink. Drag a node to move it. Delete removes it, Esc deselects, drag the background to pan.'}
      </p>
      <svg
        ref={svgRef}
        className="re-map"
        viewBox={`${view.x} ${view.y} ${view.w} ${h}`}
        preserveAspectRatio="xMidYMid slice"
        onWheel={onWheel}
        onPointerDown={onBackgroundDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <rect width={MAP_SIZE} height={MAP_SIZE} fill="#1c2a1f" />
        <image href="/map/erlc-map.webp" width={MAP_SIZE} height={MAP_SIZE} opacity={0.75} />
        <path d={edgePath} fill="none" stroke="#34d399" strokeWidth={2.4 * scale} strokeLinecap="round" />
        {linked.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={draft.nodes[a][0]}
            y1={draft.nodes[a][1]}
            x2={draft.nodes[b][0]}
            y2={draft.nodes[b][1]}
            stroke="#ffffff"
            strokeWidth={3.4 * scale}
          />
        ))}
        {showPostals
          ? postals.map((p) => (
              <g key={p.id} transform={`translate(${p.x} ${p.y})`} pointerEvents="none">
                <circle r={(cutOff.has(p.id) ? 9 : 5) * scale} fill={cutOff.has(p.id) ? '#f0616d' : '#4f8cff'} opacity={0.9} />
                <text y={-9 * scale} textAnchor="middle" fontSize={11 * scale} className="re-label">
                  {p.id}
                </text>
              </g>
            ))
          : null}
        {draft.nodes.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={(i === selected ? 7 : 4.2) * scale}
            fill={i === selected ? '#ffffff' : '#f0616d'}
            stroke="#0b0c0f"
            strokeWidth={1.2 * scale}
            onPointerDown={(e) => onNodeDown(e, i)}
            className="re-node"
          />
        ))}
      </svg>
    </div>
  );
}
