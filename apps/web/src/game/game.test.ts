import { describe, expect, it } from 'vitest';
import { factOrder, scenarios, startingUnits } from '../data/content';
import { postalById } from '../data/postals';
import { etaSeconds, stepUnit } from './sim';
import { initialState, reducer, type Action, type GameState } from './state';

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
});

describe('movement', () => {
  it('moves a unit toward its target and marks it on scene', () => {
    const unit = { ...startingUnits()[0], status: 'enroute' as const, targetX: 600, targetY: 1300 };
    const first = stepUnit(unit, 0.1);
    expect(first.arrived).toBe(false);
    expect(first.unit.x).not.toBe(unit.x);
    const done = stepUnit(unit, 1000);
    expect(done.arrived).toBe(true);
    expect(done.unit.status).toBe('onscene');
  });

  it('gives an eta only for known postals', () => {
    const unit = startingUnits()[0];
    expect(etaSeconds(unit, 322)).toBeGreaterThan(0);
    expect(etaSeconds(unit, 99999)).toBeNull();
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
