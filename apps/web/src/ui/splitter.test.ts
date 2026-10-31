import { describe, expect, it } from 'vitest';
import { resizeAt, tracks } from './Splitter';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe('resizeAt', () => {
  it('moves the edge between two panels and keeps the total', () => {
    const next = resizeAt([1, 1, 1], 0, 0.1);
    expect(next[0]).toBeCloseTo(1.3);
    expect(next[1]).toBeCloseTo(0.7);
    expect(next[2]).toBe(1);
    expect(sum(next)).toBeCloseTo(3);
  });

  it('works in both directions', () => {
    const next = resizeAt([2, 1], 0, -0.2);
    expect(next[0]).toBeCloseTo(1.4);
    expect(next[1]).toBeCloseTo(1.6);
  });

  it('never shrinks a panel below the minimum', () => {
    const big = resizeAt([1, 1], 0, 5);
    expect(big[1] / sum(big)).toBeCloseTo(0.12);
    const small = resizeAt([1, 1], 0, -5);
    expect(small[0] / sum(small)).toBeCloseTo(0.12);
  });

  it('ignores an edge that does not exist', () => {
    expect(resizeAt([1, 1], 1, 0.1)).toEqual([1, 1]);
  });

  it('does not change the input', () => {
    const input = [1, 1];
    resizeAt(input, 0, 0.1);
    expect(input).toEqual([1, 1]);
  });
});

describe('tracks', () => {
  it('puts a gutter between every panel', () => {
    expect(tracks([1.25, 0.8, 1], 14)).toBe('1.25fr 14px 0.8fr 14px 1fr');
    expect(tracks([1], 14)).toBe('1fr');
  });
});
