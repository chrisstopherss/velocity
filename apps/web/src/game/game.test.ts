import { describe, expect, it } from 'vitest';
import { answerFor, factOrder, incidentTypes, startingUnits } from '../data/content';
import { chooseScenario, firstScenario, instantiate, templates } from '../data/scenarios';
import { getErlcLocation } from '../data/erlcLocation';
import { postalById, postals } from '../data/postals';
import { rawRoads } from '../data/roads.data';
import { agencyColor, agencyIcons, headingOf, priorityStyle } from '../panels/MapMarkers';
import { check, components } from '../roads/edit';
import { buildGraph, roundCorners, routeBetween } from './routing';
import { etaSeconds, PATROL_SPEED, routeToPostal, stepUnit, UNIT_SPEED } from './sim';
import { PLATE_DELAY, scoreStop } from './stops';
import type { Stop } from './types';
import { initialState, MAX_TYPED, MAX_TYPED_CHARS, reducer, type Action, type GameState } from './state';

function run(state: GameState, actions: Action[]): GameState {
  return actions.reduce(reducer, state);
}

function untilRinging(state: GameState): GameState {
  return reducer(state, { type: 'tick', dt: state.ringAt - state.clock + 0.1 });
}

describe('data', () => {
  it('has a postal for every scenario and starting unit', () => {
    expect(postalById.has(firstScenario().truth.postal)).toBe(true);
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
    for (const s of everyCall()) {
      if (s.locationOverride) continue;
      const answer = answerFor(s, 'location');
      const street = postalById.get(s.truth.postal)?.street;
      expect(answer).toContain(String(s.truth.postal));
      if (street) expect(answer).toContain(street);
    }
  });
});

function everyCall() {
  return templates.flatMap((t) =>
    t.callers.flatMap((_, caller) =>
      t.variants.flatMap((_v, variant) => t.places.map((_p, place) => instantiate(t, { caller, variant, place }))),
    ),
  );
}

describe('scenario pack', () => {
  it('has five variants of every call and enough callers and places', () => {
    expect(templates.length).toBeGreaterThanOrEqual(16);
    for (const t of templates) {
      expect(t.variants, t.id).toHaveLength(5);
      expect(t.callers.length).toBeGreaterThanOrEqual(3);
      expect(t.places.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('only uses known types, real postals and complete answers', () => {
    const types = new Set(incidentTypes.map((t) => t.id));
    for (const t of templates) {
      expect(types.has(t.type)).toBe(true);
      expect(t.ringAfter[0]).toBeLessThanOrEqual(t.ringAfter[1]);
      for (const place of t.places) expect(postalById.has(place), `${t.id} postal ${place}`).toBe(true);
      for (const v of t.variants) {
        expect(v.label.length).toBeGreaterThan(3);
        expect([1, 2, 3, 4]).toContain(v.priority);
        if (v.type) expect(types.has(v.type)).toBe(true);
        for (const text of [v.opening, v.nature, v.weapons, v.injuries, v.suspect, v.safety]) {
          expect(text.trim().length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('keeps the truth of every variant consistent', () => {
    for (const t of templates) {
      for (const v of t.variants) {
        const notReal = v.type === 'false_report';
        expect(v.minUnits === 0, `${t.id} ${v.label}`).toBe(notReal);
        if (notReal) {
          expect(v.priority).toBe(4);
          expect(v.behavior, `${t.id} ${v.label} needs a behaviour`).toBeTruthy();
        }
      }
    }
  });

  it('mixes severe, routine and not real versions of every call', () => {
    for (const t of templates) {
      expect(t.variants.some((v) => v.priority === 1 || v.priority === 2), t.id).toBe(true);
      expect(t.variants.some((v) => v.priority >= 3 && v.minUnits > 0), t.id).toBe(true);
      expect(t.variants.some((v) => v.minUnits === 0), t.id).toBe(true);
    }
  });

  it('has a template for every real incident type', () => {
    const used = new Set(templates.flatMap((t) => [t.type, ...t.variants.map((v) => v.type ?? t.type)]));
    for (const type of incidentTypes) expect(used.has(type.id), type.id).toBe(true);
    expect(templates.some((t) => t.variants.some((v) => v.type === 'false_report'))).toBe(true);
  });

  it('has unique template ids', () => {
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
  });

  it('picks a different first call for different seeds', () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) firsts.add(chooseScenario(seed * 7919, 0).id);
    expect(firsts.size).toBeGreaterThanOrEqual(10);
    expect([...firsts].some((id) => id !== 'shots-fired')).toBe(true);
  });

  it('keeps varying and never repeats a template back to back', () => {
    const ids = new Set<string>();
    const picks = new Set<string>();
    let previous = chooseScenario(7, 0).id;
    for (let n = 1; n <= 60; n++) {
      const s = chooseScenario(7, n, previous);
      expect(s.id).not.toBe(previous);
      expect(s.ringAfter).toBeGreaterThanOrEqual(3);
      previous = s.id;
      ids.add(s.id);
      picks.add(JSON.stringify([s.id, s.pick]));
    }
    expect(ids.size).toBeGreaterThanOrEqual(12);
    expect(picks.size).toBeGreaterThan(40);
  });

  it('starts a restarted shift on a different call', () => {
    const state = initialState(11, chooseScenario(11, 0));
    const again = reducer(state, { type: 'reset' });
    expect(again.seed).toBe(12);
    expect(again.scenario.id).not.toBe(state.scenario.id);
    expect(again.phase).toBe('waiting');
  });

  it('uses the scenario it is given for the first call', () => {
    const scenario = chooseScenario(3, 0);
    expect(initialState(3, scenario).scenario).toBe(scenario);
    expect(initialState().scenario.id).toBe('shots-fired');
  });

  it('gives the same call for the same seed and a different one for another seed', () => {
    expect(chooseScenario(5, 3)).toEqual(chooseScenario(5, 3));
    const a = JSON.stringify(Array.from({ length: 8 }, (_, n) => chooseScenario(5, n).pick));
    const b = JSON.stringify(Array.from({ length: 8 }, (_, n) => chooseScenario(99, n).pick));
    expect(a).not.toBe(b);
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

  it('remembers the corners it has passed and clears them on arrival', () => {
    const unit = {
      ...startingUnits()[0],
      x: 0,
      y: 0,
      status: 'enroute' as const,
      trail: [{ x: 0, y: 0 }],
      route: [
        { x: 60, y: 0 },
        { x: 60, y: 60 },
      ],
    };
    const mid = stepUnit(unit, 1.5).unit;
    expect(mid.trail).toEqual([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
    ]);
    const done = stepUnit(unit, 100).unit;
    expect(done.trail).toEqual([]);
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

  it('joins the road partway along a long segment instead of at its end nodes', () => {
    const long = buildGraph({
      nodes: [
        [0, 0],
        [1000, 0],
      ],
      edges: [[0, 1]],
    });
    const route = routeBetween(long, { x: 500, y: 12 }, { x: 900, y: 12 });
    expect(route.onRoad).toBe(true);
    expect(route.length).toBeCloseTo(424, 0);
  });

  it('rounds corners without moving the ends', () => {
    const raw = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const smooth = roundCorners(raw);
    expect(smooth[0]).toEqual(raw[0]);
    expect(smooth.at(-1)).toEqual(raw[2]);
    expect(smooth.length).toBeGreaterThan(raw.length);
    expect(smooth.every((p) => !(p.x === 100 && p.y === 0))).toBe(true);
    for (const p of smooth) expect(Math.hypot(p.x - 100, p.y - 0)).toBeGreaterThan(0.5);
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

describe('calls that need no units', () => {
  const prank = () => {
    const template = templates.find((t) => t.id === 'shots-fired')!;
    const variant = template.variants.findIndex((v) => v.label === 'Prank caller');
    return instantiate(template, { caller: 0, variant, place: 0 });
  };
  const ready = (scenario: ReturnType<typeof prank>) =>
    run(untilRinging(initialState(1, scenario)), [{ type: 'answer' }]);

  it('describes the prank as not real and keeps its location vague', () => {
    const s = prank();
    expect(s.truth).toMatchObject({ type: 'false_report', priority: 4, minUnits: 0 });
    expect(answerFor(s, 'location')).toContain('downtown somewhere');
    expect(answerFor(s, 'location')).not.toContain(String(s.truth.postal));
  });

  it('lets you close a call without units and scores a logged false report highly', () => {
    const done = run(ready(prank()), [
      ...factOrder.map((fact): Action => ({ type: 'ask', fact })),
      { type: 'create', draft: { type: 'false_report', priority: 4, postal: 322, narrative: 'prank' } },
      { type: 'dismiss' },
    ]);
    expect(done.phase).toBe('closed');
    expect(done.units.every((u) => u.status === 'available')).toBe(true);
    expect(done.score!.total).toBeGreaterThanOrEqual(90);
    expect(done.score!.reveal).toContain('Prank caller');
    expect(done.score!.reveal).toContain('No response was needed');
  });

  it('takes points away for sending units to a prank', () => {
    const sent = run(ready(prank()), [
      ...factOrder.map((fact): Action => ({ type: 'ask', fact })),
      { type: 'create', draft: { type: 'false_report', priority: 4, postal: 322, narrative: '' } },
      { type: 'dispatch', unitIds: ['1A-12', '1A-09'] },
      { type: 'clear' },
    ]);
    const unitLine = sent.score!.lines.find((l) => l.label === 'Unit choice')!;
    expect(unitLine.points).toBe(0);
    expect(unitLine.note).toContain('none were needed');
  });

  it('scores a real call that was closed without units as a miss', () => {
    const done = run(ready(firstScenario()), [{ type: 'dismiss' }]);
    expect(done.phase).toBe('closed');
    expect(done.score!.total).toBeLessThan(30);
    expect(done.score!.lines.find((l) => l.label === 'Unit choice')!.points).toBe(0);
  });

  it('only closes a call that has been answered and not yet dispatched', () => {
    const waiting = initialState();
    expect(reducer(waiting, { type: 'dismiss' })).toBe(waiting);
    const sent = run(ready(firstScenario()), [
      { type: 'create', draft: { type: 'shots_fired', priority: 1, postal: 322, narrative: '' } },
      { type: 'dispatch', unitIds: ['1A-12'] },
    ]);
    expect(reducer(sent, { type: 'dismiss' })).toBe(sent);
  });
});

describe('patrol', () => {
  const secondsLater = (state: GameState, seconds: number) => {
    let s = state;
    for (let i = 0; i < seconds * 2; i++) s = reducer(s, { type: 'tick', dt: 0.5 });
    return s;
  };

  it('keeps available units moving on the streets', () => {
    const start = initialState();
    const later = secondsLater(start, 90);
    const moved = later.units.filter((u, i) => Math.hypot(u.x - start.units[i].x, u.y - start.units[i].y) > 20);
    expect(moved.length).toBe(start.units.length);
    expect(later.units.every((u) => u.status === 'available')).toBe(true);
  });

  it('patrols slower than it responds and says nothing on the radio', () => {
    const later = secondsLater(initialState(), 30);
    const moving = later.units.filter((u) => u.route.length);
    expect(moving.length).toBeGreaterThan(0);
    expect(later.radio).toHaveLength(0);
    expect(PATROL_SPEED).toBeLessThan(UNIT_SPEED);
  });

  it('repeats the same patrol for the same seed and differs for another', () => {
    const a = secondsLater(initialState(5), 40).units.map((u) => [Math.round(u.x), Math.round(u.y)]);
    const b = secondsLater(initialState(5), 40).units.map((u) => [Math.round(u.x), Math.round(u.y)]);
    const c = secondsLater(initialState(99), 40).units.map((u) => [Math.round(u.x), Math.round(u.y)]);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('drops the patrol for a dispatch and goes back to patrolling afterwards', () => {
    const base = secondsLater(run(untilRinging(initialState()), [{ type: 'answer' }]), 5);
    const sent = run(base, [
      { type: 'create', draft: { type: 'shots_fired', priority: 1, postal: 322, narrative: '' } },
      { type: 'dispatch', unitIds: ['1A-12'] },
    ]);
    const unit = sent.units.find((u) => u.id === '1A-12')!;
    expect(unit.status).toBe('enroute');
    expect(unit.trail).toHaveLength(1);

    const there = secondsLater(sent, 120);
    expect(there.units.find((u) => u.id === '1A-12')!.status).toBe('onscene');
    expect(there.radio.map((r) => r.text).join(' ')).toContain('1A-12 on scene');

    const cleared = reducer(there, { type: 'clear' });
    expect(cleared.units.find((u) => u.id === '1A-12')!.status).toBe('available');
    const after = secondsLater(cleared, 20);
    const roaming = after.units.find((u) => u.id === '1A-12')!;
    expect(Math.hypot(roaming.x - 1086, roaming.y - 1197)).toBeGreaterThan(5);
  });
});

describe('questions for each call', () => {
  const FACTS = ['location', 'nature', 'weapons', 'injuries', 'suspect', 'safety'];
  const collision = () => instantiate(templates.find((t) => t.id === 'collision')!, { caller: 0, variant: 0, place: 0 });

  it('only lists real questions, always asking location and nature first', () => {
    for (const t of templates) {
      for (const list of [t.questions, ...t.variants.map((v) => v.questions ?? t.questions)]) {
        expect(new Set(list).size).toBe(list.length);
        for (const f of list) expect(FACTS, `${t.id} ${f}`).toContain(f);
        expect(list).toContain('location');
        expect(list).toContain('nature');
      }
    }
  });

  it('leaves out questions that make no sense for the call', () => {
    const c = collision();
    expect(c.questions).not.toContain('weapons');
    expect(c.questions).not.toContain('suspect');
    const alarm = instantiate(templates.find((t) => t.id === 'alarm')!, { caller: 0, variant: 0, place: 0 });
    expect(alarm.questions).not.toContain('injuries');
    expect(templates.find((t) => t.id === 'shots-fired')!.questions).toHaveLength(6);
  });

  it('lets a variant ask more than its template', () => {
    const theft = templates.find((t) => t.id === 'vehicle-theft')!;
    const carjacking = theft.variants.findIndex((v) => v.label === 'Carjacking');
    const s = instantiate(theft, { caller: 0, variant: carjacking, place: 0 });
    expect(s.questions).toContain('weapons');
    expect(instantiate(theft, { caller: 0, variant: 0, place: 0 }).questions).not.toContain('weapons');
  });

  it('ignores a question the call does not have', () => {
    const answered = run(untilRinging(initialState(1, collision())), [{ type: 'answer' }]);
    expect(reducer(answered, { type: 'ask', fact: 'weapons' })).toBe(answered);
    expect(reducer(answered, { type: 'ask', fact: 'injuries' }).asked).toContain('injuries');
  });

  it('gives full information marks for asking everything that applies', () => {
    const c = collision();
    const done = run(untilRinging(initialState(1, c)), [
      { type: 'answer' },
      ...c.questions.map((fact): Action => ({ type: 'ask', fact })),
      { type: 'create', draft: { type: 'traffic_collision', priority: 2, postal: c.truth.postal, narrative: '' } },
      { type: 'dispatch', unitIds: ['1A-12', '1A-09', 'S-21'] },
      { type: 'clear' },
    ]);
    expect(done.score!.lines.find((l) => l.label === 'Information gathered')).toMatchObject({ points: 30, max: 30 });
  });

  it('scales the information marks to the questions that apply', () => {
    const c = collision();
    const half = run(untilRinging(initialState(1, c)), [{ type: 'answer' }, { type: 'ask', fact: 'location' }, { type: 'ask', fact: 'nature' }, { type: 'dismiss' }]);
    expect(half.score!.lines.find((l) => l.label === 'Information gathered')!.points).toBe(15);
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
    expect(next.scenario.id).not.toBe(closed.scenario.id);
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

describe('map markers', () => {
  const base = { ...startingUnits()[0], x: 100, y: 100 };

  it('points the heading wedge toward the next route point', () => {
    const east = { ...base, status: 'enroute' as const, route: [{ x: 200, y: 100 }] };
    const north = { ...base, status: 'enroute' as const, route: [{ x: 100, y: 0 }] };
    expect(headingOf(east)).toBeCloseTo(90);
    expect(headingOf(north)).toBeCloseTo(0);
  });

  it('skips points right on top of the unit and shows no heading when parked', () => {
    const near = { ...base, status: 'enroute' as const, route: [{ x: 100.5, y: 100 }, { x: 100, y: 200 }] };
    expect(headingOf(near)).toBeCloseTo(180);
    expect(headingOf({ ...base, status: 'onscene', route: [] })).toBeNull();
    expect(headingOf({ ...base, status: 'enroute', route: [] })).toBeNull();
  });

  it('has a colour for every priority and agency', () => {
    for (const p of [1, 2, 3, 4] as const) expect(priorityStyle[p].fill).toMatch(/^#/);
    for (const a of ['PD', 'SO', 'SP'] as const) {
      expect(agencyColor[a]).toMatch(/^#/);
      expect(agencyIcons[a]).toBeTruthy();
    }
  });
});

describe('traffic stops', () => {
  const withStop = (outcome: Stop['outcome'] = 'routine') => {
    let s = initialState(3, firstScenario(), true);
    s = reducer(s, { type: 'tick', dt: s.nextStopAt - s.clock + 0.1 });
    const stop = s.stops[0];
    s = { ...s, stops: [{ ...stop, outcome }] };
    return s;
  };

  it('stays off unless it is turned on', () => {
    const s = reducer(initialState(3), { type: 'tick', dt: 300 });
    expect(s.stops).toHaveLength(0);
  });

  it('puts a free unit on a stop and calls it in on the radio', () => {
    const s = withStop();
    expect(s.stops).toHaveLength(1);
    expect(s.units.find((u) => u.id === s.stops[0].unitId)?.status).toBe('onstop');
    expect(s.radio.some((l) => l.text.includes('traffic stop'))).toBe(true);
  });

  it('needs the copy before the plate can run', () => {
    let s = withStop();
    expect(reducer(s, { type: 'stopPlate' })).toBe(s);
    s = run(s, [{ type: 'stopCopy' }, { type: 'stopPlate' }]);
    expect(s.stops[0].plateAskedAt).not.toBeNull();
    s = reducer(s, { type: 'tick', dt: PLATE_DELAY + 0.1 });
    expect(s.stops[0].plateResult).toBeTruthy();
  });

  it('asks for backup on a hit and sends the units that were picked', () => {
    let s = run(withStop('stolen'), [{ type: 'stopCopy' }, { type: 'stopPlate' }]);
    s = reducer(s, { type: 'tick', dt: PLATE_DELAY + 0.1 });
    expect(s.stops[0].backupAskedAt).not.toBeNull();
    const free = s.units.find((u) => u.status === 'available')!;
    s = reducer(s, { type: 'stopBackup', unitIds: [free.id] });
    expect(s.stops[0].backupIds).toEqual([free.id]);
    expect(s.units.find((u) => u.id === free.id)?.status).toBe('enroute');
  });

  it('scores a clean stop with no backup at full marks', () => {
    const stop = { ...withStop().stops[0], ackAt: 5, plateAskedAt: 10 };
    expect(scoreStop(stop, false).total).toBe(100);
    expect(scoreStop({ ...stop, backupIds: ['1A-12'] }, false).total).toBe(50);
  });

  it('frees the units and scores when a routine stop runs out', () => {
    let s = run(withStop(), [{ type: 'stopCopy' }, { type: 'stopPlate' }]);
    s = reducer(s, { type: 'tick', dt: 120 });
    expect(s.stops[0].closedAt).not.toBeNull();
    expect(s.stopResults).toHaveLength(1);
    expect(s.units.every((u) => u.status !== 'onstop')).toBe(true);
  });
});
