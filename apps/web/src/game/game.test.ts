import { describe, expect, it } from 'vitest';
import { answerFor, factOrder, scenarios, startingUnits } from '../data/content';
import { getErlcLocation } from '../data/erlcLocation';
import { postalById, postals } from '../data/postals';
import { rawRoads } from '../data/roads.data';
import { check, components } from '../roads/edit';
import { buildGraph, routeBetween } from './routing';
import { etaSeconds, routeToPostal, stepUnit, UNIT_SPEED } from './sim';
import { initialState, MAX_TYPED, MAX_TYPED_CHARS, reducer, type Action, type GameState } from './state';

function run(state: GameState, actions: Action[]): GameState {
  return actions.reduce(reducer, state);
}

function untilRinging(state: GameState): GameState {
  return reducer(state, { type: 'tick', dt: state.ringAt - state.clock + 0.1 });
}

describe('data', () => {
  it('has a postal for every scenario and starting unit', () => {
    for (const s of scenarios) expect(postalById.has(s.truth.postal)).toBe(true);
    expect(startingUnits().length).toBeGreaterThan(0);
  });

  it('has unique postal ids', () => {
    const ids = [...postalById.keys()];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every postal inside the map image', () => {
    for (const p of postalById.values()) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1932);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1932);
    }
  });

  it('uses corrected street names', () => {
    const streets = new Set([...postalById.values()].map((p) => p.street));
    for (const typo of ['Independance Parkway', 'Freicht Street', 'Pock Street', 'Ceoar Circle']) {
      expect(streets.has(typo)).toBe(false);
    }
    expect(streets.has('Independence Parkway')).toBe(true);
  });

  it('builds the caller location from the real postal data', () => {
    for (const s of scenarios) {
      const answer = answerFor(s, 'location');
      const street = postalById.get(s.truth.postal)?.street;
      expect(answer).toContain(String(s.truth.postal));
      if (street) expect(answer).toContain(street);
    }
  });
});

describe('erlc location lookup', () => {
  it('finds the street, building and postal for a position', () => {
    expect(getErlcLocation(1536.96, 4453.76)).toEqual({ street: 'Main Street', building: '2001', postal: '201' });
  });

  it('returns null off the map and for bad input', () => {
    expect(getErlcLocation(-5, 100)).toBeNull();
    expect(getErlcLocation(Number.NaN, 1000)).toBeNull();
  });

  it('allows any single field to be missing', () => {
    const loc = getErlcLocation(3000, 4000);
    expect(loc).not.toBeNull();
    expect(Object.values(loc!).some((v) => v === null)).toBe(true);
  });

  it('puts every postal in its own postal code', () => {
    for (const p of postals) {
      const [x, y] = [(p.x - 3.5) / 0.3589, (p.y - 2.8) / 0.3598];
      expect(getErlcLocation(x, y)?.postal).toBe(String(p.id));
    }
  });
});

describe('movement', () => {
  it('moves a unit along its route and marks it on scene', () => {
    const route = [
      { x: 600, y: 1300 },
      { x: 700, y: 1300 },
    ];
    const unit = { ...startingUnits()[0], status: 'enroute' as const, route };
    const first = stepUnit(unit, 0.1);
    expect(first.arrived).toBe(false);
    expect(first.unit.x).not.toBe(unit.x);
    const done = stepUnit(unit, 1000);
    expect(done.arrived).toBe(true);
    expect(done.unit).toMatchObject({ status: 'onscene', x: 700, y: 1300, route: [] });
  });

  it('follows the corners of the route instead of cutting across', () => {
    const unit = {
      ...startingUnits()[0],
      x: 0,
      y: 0,
      status: 'enroute' as const,
      route: [
        { x: 60, y: 0 },
        { x: 60, y: 60 },
      ],
    };
    const mid = stepUnit(unit, 1.5);
    expect(mid.unit.x).toBe(60);
    expect(mid.unit.y).toBeCloseTo(30);
    expect(mid.unit.route).toHaveLength(1);
  });

  it('gives an eta only for known postals', () => {
    const unit = startingUnits()[0];
    expect(etaSeconds(unit, 322)).toBeGreaterThan(0);
    expect(etaSeconds(unit, 99999)).toBeNull();
  });
});

describe('roads', () => {
  const grid = buildGraph({
    nodes: [
      [0, 0],
      [100, 0],
      [100, 100],
      [500, 500],
    ],
    edges: [
      [0, 1],
      [1, 2],
    ],
  });

  it('routes around the corner and is longer than the straight line', () => {
    const route = routeBetween(grid, { x: 0, y: 0 }, { x: 100, y: 100 });
    expect(route.onRoad).toBe(true);
    expect(route.length).toBeCloseTo(200);
    expect(route.points[route.points.length - 1]).toEqual({ x: 100, y: 100 });
  });

  it('falls back to a straight line when the target is cut off', () => {
    const route = routeBetween(grid, { x: 0, y: 0 }, { x: 500, y: 500 });
    expect(route.onRoad).toBe(false);
    expect(route.points).toHaveLength(2);
  });

  it('has no isolated postal in the shipped graph', () => {
    const unit = { x: 600, y: 1300 };
    for (const id of postalById.keys()) {
      const eta = etaSeconds(unit, id);
      expect(eta).not.toBeNull();
      expect(Number.isFinite(eta)).toBe(true);
    }
  });

  it('ships one connected road network', () => {
    const comp = components({ nodes: rawRoads.nodes, edges: rawRoads.edges });
    expect(new Set(comp).size).toBe(1);
    expect(check({ nodes: rawRoads.nodes, edges: rawRoads.edges }, postals).cutOff).toEqual([]);
  });

  it('gives every postal a road route from the first unit', () => {
    const unit = startingUnits()[0];
    const onRoad = [...postalById.keys()].filter((id) => routeToPostal(unit, id)!.length > 2);
    expect(onRoad.length).toBeGreaterThanOrEqual(postalById.size - 3);
  });

  it('keeps routes close to the straight line distance', () => {
    const unit = startingUnits()[0];
    for (const p of postals) {
      const eta = etaSeconds(unit, p.id)!;
      const straight = Math.hypot(p.x - unit.x, p.y - unit.y) / UNIT_SPEED;
      expect(eta).toBeGreaterThanOrEqual(straight - 0.01);
      expect(eta).toBeLessThan(straight * 4 + 20);
    }
  });
});

describe('call flow', () => {
  it('rings after the scenario delay and ignores early answers', () => {
    const start = initialState();
    expect(reducer(start, { type: 'answer' }).phase).toBe('waiting');
    expect(untilRinging(start).phase).toBe('ringing');
  });

  it('does not allow creating an incident with an unknown postal', () => {
    const answered = run(untilRinging(initialState()), [{ type: 'answer' }]);
    const res = reducer(answered, {
      type: 'create',
      draft: { type: 'shots_fired', priority: 1, postal: 99999, narrative: '' },
    });
    expect(res.phase).toBe('call');
  });

  it('does not repeat a question', () => {
    const answered = run(untilRinging(initialState()), [{ type: 'answer' }, { type: 'ask', fact: 'weapons' }]);
    const again = reducer(answered, { type: 'ask', fact: 'weapons' });
    expect(again.transcript.length).toBe(answered.transcript.length);
  });

  it('takes a typed question, then the reply and the facts it gave away', () => {
    const answered = run(untilRinging(initialState()), [{ type: 'answer' }]);
    const asking = reducer(answered, { type: 'say', text: '  Any weapons?  ' });
    expect(asking.pending).toBe(true);
    expect(asking.typed).toBe(1);
    expect(asking.transcript.at(-1)).toEqual({ from: 'you', text: 'Any weapons?' });
    expect(reducer(asking, { type: 'say', text: 'again' })).toBe(asking);

    const replied = reducer(asking, { type: 'reply', call: 0, text: 'No gun.', told: ['weapons'] });
    expect(replied.pending).toBe(false);
    expect(replied.asked).toContain('weapons');
    expect(replied.transcript.at(-1)).toEqual({ from: 'caller', text: 'No gun.' });
  });

  it('caps typed questions and trims them', () => {
    let s = run(untilRinging(initialState()), [{ type: 'answer' }]);
    for (let i = 0; i < MAX_TYPED + 2; i++) {
      s = reducer(reducer(s, { type: 'say', text: 'x'.repeat(300) }), { type: 'reply', call: 0, text: 'ok', told: [] });
    }
    expect(s.typed).toBe(MAX_TYPED);
    expect(s.transcript.filter((t) => t.from === 'you').length).toBe(MAX_TYPED + 1);
    expect(s.transcript.find((t) => t.text.startsWith('xxx'))!.text).toHaveLength(MAX_TYPED_CHARS);
  });

  it('ignores a late reply from a previous call and a say before answering', () => {
    const waiting = initialState();
    expect(reducer(waiting, { type: 'say', text: 'hello' })).toBe(waiting);
    const asking = reducer(run(untilRinging(waiting), [{ type: 'answer' }]), { type: 'say', text: 'hi' });
    const stale = reducer(asking, { type: 'reply', call: 5, text: 'late', told: ['nature'] });
    expect(stale).toBe(asking);
  });

  it('scores a good call high and a careless call low', () => {
    const base = untilRinging(initialState());
    const good = run(base, [
      { type: 'answer' },
      ...factOrder.map((fact): Action => ({ type: 'ask', fact })),
      { type: 'create', draft: { type: 'shots_fired', priority: 1, postal: 322, narrative: 'shots fired' } },
      { type: 'dispatch', unitIds: ['1A-12', '1A-09'] },
      { type: 'clear' },
    ]);
    expect(good.phase).toBe('closed');
    expect(good.score!.total).toBeGreaterThanOrEqual(90);

    const sloppy = run(base, [
      { type: 'tick', dt: 30 },
      { type: 'answer' },
      { type: 'create', draft: { type: 'alarm', priority: 4, postal: 210, narrative: '' } },
      { type: 'tick', dt: 200 },
      { type: 'dispatch', unitIds: ['S-24'] },
      { type: 'clear' },
    ]);
    expect(sloppy.score!.total).toBeLessThan(30);
  });

  it('frees units and moves to the next scenario', () => {
    const closed = run(untilRinging(initialState()), [
      { type: 'answer' },
      { type: 'create', draft: { type: 'shots_fired', priority: 1, postal: 322, narrative: '' } },
      { type: 'dispatch', unitIds: ['1A-12'] },
      { type: 'tick', dt: 60 },
      { type: 'clear' },
    ]);
    expect(closed.units.find((u) => u.id === '1A-12')!.status).toBe('available');
    const next = reducer(closed, { type: 'next' });
    expect(next.phase).toBe('waiting');
    expect(next.scenario.id).toBe(scenarios[1].id);
    expect(next.incident).toBeNull();
  });

  it('logs radio traffic for dispatch and arrival', () => {
    const state = run(untilRinging(initialState()), [
      { type: 'answer' },
      { type: 'create', draft: { type: 'shots_fired', priority: 1, postal: 322, narrative: '' } },
      { type: 'dispatch', unitIds: ['1A-12'] },
      { type: 'tick', dt: 60 },
    ]);
    const texts = state.radio.map((r) => r.text).join(' | ');
    expect(texts).toContain('respond to shots fired');
    expect(texts).toContain('1A-12 on scene');
  });
});
